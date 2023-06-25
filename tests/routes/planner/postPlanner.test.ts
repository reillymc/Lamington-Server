import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    PlannerEndpoint,
    CleanTables,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
} from "../../helpers";
import { PlannerActions, PlannerMemberActions } from "../../../src/controllers";
import { CreatePlannerParams } from "../../../src/controllers/planner";
import { PostPlannerRequestBody } from "../../../src/routes/spec";
import { EntityMember } from "../../../src/controllers/entity";

beforeEach(async () => {
    await CleanTables("planner", "user", "planner_member");
});

afterAll(async () => {
    await CleanTables("planner", "user", "planner_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(PlannerEndpoint.postPlanner);

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant planner", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ plannerId: uuid(), name: uuid(), variant: uuid() } as PostPlannerRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if not planner owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ plannerId: planner.plannerId, name: uuid(), variant: uuid() } as PostPlannerRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should not allow editing if planner member but not planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);
    await PlannerMemberActions.save({
        plannerId: planner.plannerId,
        members: [
            {
                userId: user!.userId,
                accepted: true,
                allowEditing: true,
            },
        ],
    });

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ plannerId: planner.plannerId, name: uuid(), variant: uuid() } as PostPlannerRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should create planner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const users = await CreateUsers();

    const planner = {
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        members: users!.map(({ userId }) => ({ userId, allowEditing: randomBoolean })),
    } satisfies Partial<PostPlannerRequestBody>;

    const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(planner);

    expect(res.statusCode).toEqual(201);

    const savedPlanners = await PlannerActions.readMy({ userId: user.userId });

    expect(savedPlanners.length).toEqual(1);

    const [savedPlanner] = savedPlanners;
    const savedPlannerMembers = await PlannerMemberActions.read({ entityId: savedPlanner!.plannerId });

    expect(savedPlanner?.name).toEqual(planner.name);
    expect(savedPlanner?.variant).toEqual(planner.variant);
    expect(savedPlanner?.description).toEqual(planner.description);
    expect(savedPlanner?.createdBy).toEqual(user.userId);
    expect(savedPlannerMembers.length).toEqual(planner.members!.length);

    for (const { userId, allowEditing } of planner.members!) {
        const savedPlannerMember = savedPlannerMembers.find(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedPlannerMember).toBeTruthy();

        expect(savedPlannerMember?.canEdit).toEqual(allowEditing ? 1 : 0);
    }
});

test("should save updated planner details as planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: user.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);

    const updatedPlanner: Partial<PostPlannerRequestBody> = {
        plannerId: planner.plannerId,
        name: uuid(),
        description: uuid(),
        variant: uuid(),
    };

    const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(updatedPlanner);

    expect(res.statusCode).toEqual(201);

    const [savedPlanner] = await PlannerActions.read({ plannerId: planner.plannerId, userId: user.userId });

    expect(savedPlanner?.name).toEqual(updatedPlanner.name);
    expect(savedPlanner?.variant).toEqual(updatedPlanner.variant);
    expect(savedPlanner?.description).toEqual(updatedPlanner.description);
    expect(savedPlanner?.plannerId).toEqual(planner.plannerId);
    expect(savedPlanner?.createdBy).toEqual(planner.createdBy);
});

test("should save additional planner members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const initialUsers = await CreateUsers({ count: randomCount });
    const additionalUsers = await CreateUsers({ count: randomCount });

    const initialMembers: EntityMember[] = initialUsers.map(({ userId }) => ({ userId }));
    const additionalMembers: EntityMember[] = additionalUsers.map(({ userId }) => ({ userId }));
    const allMembers = [...initialMembers, ...additionalMembers];

    const [planner] = await PlannerActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        members: initialMembers,
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(initialMembers.length);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ ...planner, members: allMembers } as Partial<PostPlannerRequestBody>);

    expect(res.statusCode).toEqual(201);

    const savedPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });

    expect(savedPlannerMembers.length).toEqual(allMembers.length);

    savedPlannerMembers.forEach(({ userId }) => {
        const savedPlannerMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedPlannerMember).toBeTruthy();
    });
});

test("should remove some planner members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const initialMembers = await CreateUsers({ count: randomCount });

    const members: EntityMember[] = initialMembers.map(({ userId }) => ({ userId }));
    const reducedMembers: EntityMember[] = members.slice(0, Math.max((members.length - 1) / 2));
    const excludedMembers: EntityMember[] = members.filter(
        ({ userId }) => !reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId)
    );

    const [planner] = await PlannerActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        members,
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(members.length);
    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ ...planner, members: reducedMembers } as Partial<PostPlannerRequestBody>);

    expect(res.statusCode).toEqual(201);

    const updatedPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(updatedPlannerMembers.length).toEqual(reducedMembers.length);

    updatedPlannerMembers.forEach(({ userId }) => {
        const savedPlannerMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
        const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedPlannerMember).toBeTruthy();
        expect(illegalMember).toBeFalsy();
    });
});

test("should remove all planner members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const members = await CreateUsers({ count: randomCount });

    const [planner] = await PlannerActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        members: members.map(({ userId }) => ({ userId })),
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(members.length);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ ...planner, members: [] } as Partial<PostPlannerRequestBody>);

    expect(res.statusCode).toEqual(201);

    const savedPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });

    expect(savedPlannerMembers.length).toEqual(0);
});
