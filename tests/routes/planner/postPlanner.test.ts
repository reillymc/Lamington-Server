import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { PlannerActions, PlannerMemberActions } from "../../../src/controllers";
import { EntityMember } from "../../../src/controllers/entity";
import { ServiceParams } from "../../../src/database";
import { PlannerCustomisations, parsePlannerCustomisations } from "../../../src/routes/helpers/planner";
import { PostPlannerRequestBody, UserStatus } from "../../../src/routes/spec";
import {
    CleanTables,
    CreateUsers,
    PlannerEndpoint,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
} from "../../helpers";

const getPlannerCustomisations = (): PlannerCustomisations => {
    return {
        color: uuid(),
    };
};

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

test("should not allow editing if not planner owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({
            data: { plannerId: planner.plannerId, name: uuid() },
        } satisfies PostPlannerRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should not allow editing if planner member but not planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);
    await PlannerMemberActions.save({
        plannerId: planner.plannerId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Administrator,
            },
        ],
    });

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({
            data: { plannerId: planner.plannerId, name: uuid() },
        } satisfies PostPlannerRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should create planner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const users = await CreateUsers();

    const planner = {
        data: {
            name: uuid(),
            description: uuid(),
            color: uuid(),
            members: users!.map(({ userId }) => ({
                userId,
                status: randomBoolean() ? UserStatus.Administrator : UserStatus.Registered,
            })),
        },
    } satisfies Partial<PostPlannerRequestBody>;

    const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(planner);

    expect(res.statusCode).toEqual(201);

    const savedPlanners = await PlannerActions.readMy({ userId: user.userId });

    expect(savedPlanners.length).toEqual(1);

    const [savedPlanner] = savedPlanners;
    const savedPlannerMembers = await PlannerMemberActions.read({ entityId: savedPlanner!.plannerId });

    const { color } = parsePlannerCustomisations(savedPlanner?.customisations);

    expect(savedPlanner?.name).toEqual(planner.data.name);
    expect(color).toEqual(planner.data.color);
    expect(savedPlanner?.description).toEqual(planner.data.description);
    expect(savedPlanner?.createdBy).toEqual(user.userId);
    expect(savedPlannerMembers.length).toEqual(planner.data.members!.length);

    for (const { userId, status } of planner.data.members!) {
        const savedPlannerMember = savedPlannerMembers.find(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedPlannerMember).toBeTruthy();

        expect(savedPlannerMember?.canEdit).toEqual(status);
    }
});

test("should save updated planner details as planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const customisations = getPlannerCustomisations();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        customisations: JSON.stringify(getPlannerCustomisations()),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);

    const updatedPlanner = {
        data: {
            plannerId: planner.plannerId,
            name: uuid(),
            description: uuid(),
            color: uuid(),
        },
    } satisfies PostPlannerRequestBody;

    const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(updatedPlanner);

    expect(res.statusCode).toEqual(201);

    const [savedPlanner] = await PlannerActions.read({ plannerId: planner.plannerId, userId: user.userId });

    const { color } = parsePlannerCustomisations(savedPlanner?.customisations);

    expect(savedPlanner?.name).toEqual(updatedPlanner.data!.name);
    expect(color).toEqual(updatedPlanner.data!.color);
    expect(savedPlanner?.description).toEqual(updatedPlanner.data!.description);
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
        plannerId: uuid(),
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members: initialMembers,
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(initialMembers.length);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ data: { ...planner, members: allMembers } } satisfies PostPlannerRequestBody);

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
        plannerId: uuid(),
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members,
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(members.length);
    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ data: { ...planner, members: reducedMembers } } satisfies PostPlannerRequestBody);

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
        plannerId: uuid(),
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members: members.map(({ userId }) => ({ userId })),
    });

    const initialPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });
    expect(initialPlannerMembers.length).toEqual(members.length);

    const res = await request(app)
        .post(PlannerEndpoint.postPlanner)
        .set(token)
        .send({ data: { ...planner, members: [] } } satisfies PostPlannerRequestBody);

    expect(res.statusCode).toEqual(201);

    const savedPlannerMembers = await PlannerMemberActions.read({ entityId: planner!.plannerId });

    expect(savedPlannerMembers.length).toEqual(0);
});
