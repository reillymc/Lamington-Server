import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import {
    createSpyingFileRepository,
    purgeDeletedAttachments,
} from "../helpers/fileRepository.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomNumber,
    randomYear,
} from "../helpers/index.ts";
import { randomCourse } from "../helpers/meal.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = createTestApp({ database });
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("Add meal to cook list", () => {
    it("should create a new meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}],
        });

        const meals = Array.from({ length: randomNumber(5, 1) }).map(
            (_, i) => ({
                description: uuid(),
                course: randomCourse(),
                sequence: i + 1,
                source: uuid(),
                heroImage: attachment!.attachmentId,
            }),
        ) satisfies components["schemas"]["CookListMealCreate"][];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meals);
        expect(res.statusCode).toEqual(201);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            user,
        );

        expect(mealsRead.length).toEqual(meals.length);

        mealsRead.forEach((meal) => {
            const expectedMeal = meals.find(
                (m) => m.description === meal.description,
            );

            expect(meal.description).toEqual(expectedMeal!.description);
            expect(meal.sequence).toEqual(expectedMeal!.sequence);
            expect(meal.owner.userId).toEqual(user.userId);
            expect(meal.source).toEqual(expectedMeal!.source);
            expect(meal.recipeId).toEqual(undefined);
            expect(meal.heroImage!.attachmentId).toEqual(
                expectedMeal!.heroImage,
            );
            expect(meal.heroImage!.attachmentId).toEqual(
                attachment!.attachmentId,
            );
        });
    });

    it("should create a new meal with a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const meal = {
            description: uuid(),
            course: randomCourse(),
            sequence: 1,
            source: uuid(),
            recipeId: recipe!.recipeId,
        } satisfies components["schemas"]["CookListMealCreate"];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meal);
        expect(res.statusCode).toEqual(201);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            user,
        );
        expect(mealsRead).toHaveLength(1);
        expect(mealsRead[0]!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should not create a meal with a hero image owned by another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: otherUser!.userId,
            attachments: [{}],
        });

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send([
                {
                    description: uuid(),
                    course: randomCourse(),
                    heroImage: attachment!.attachmentId,
                },
            ] satisfies components["schemas"]["CookListMealCreate"][]);

        expect(res.statusCode).toEqual(404);
        expect(res.body.fieldErrors).toEqual([
            {
                path: ["0", "heroImage"],
                location: "body",
                code: "unknownReference",
                message: "Attachment not found",
            },
        ]);
    });

    it("should not create a meal with a recipe owned by another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: otherUser!.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send([
                {
                    description: uuid(),
                    course: randomCourse(),
                    recipeId: recipe!.recipeId,
                },
            ] satisfies components["schemas"]["CookListMealCreate"][]);

        expect(res.statusCode).toEqual(404);
        expect(res.body.fieldErrors).toEqual([
            {
                path: ["0", "recipeId"],
                location: "body",
                code: "unknownReference",
                message: "Recipe not found",
            },
        ]);
    });

    it("should create a meal with a public recipe owned by another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: otherUser!.userId,
            recipes: [{ name: uuid(), public: true }],
        });

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send([
                {
                    description: uuid(),
                    course: randomCourse(),
                    recipeId: recipe!.recipeId,
                },
            ] satisfies components["schemas"]["CookListMealCreate"][]);

        expect(res.statusCode).toEqual(201);
    });

    it("should create multiple cooklist meals", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const meals = [
            {
                description: uuid(),
                course: randomCourse(),
                sequence: 1,
                source: uuid(),
            },
            {
                description: uuid(),
                course: "lunch",
                sequence: 2,
                source: uuid(),
            },
        ] satisfies components["schemas"]["CookListMealCreate"][];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meals);
        expect(res.statusCode).toEqual(201);

        const returnedMeals =
            res.body as components["schemas"]["CookListMeal"][];
        expect(returnedMeals).toHaveLength(2);
    });
});

describe("Update meal in cook list", () => {
    it("should update the meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [originalAttachment, updatedAttachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}, {}],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                    heroImage: originalAttachment!.attachmentId,
                },
            ],
        });

        const mealUpdate = {
            recipeId: recipe!.recipeId,
            description: uuid(),
            sequence: randomNumber(),
            source: uuid(),
            heroImage: updatedAttachment!.attachmentId,
        } satisfies components["schemas"]["CookListMealUpdate"];

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send(mealUpdate);
        expect(res.statusCode).toEqual(200);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            {
                userId: user.userId,
            },
        );

        expect(mealsRead.length).toEqual(1);

        const [updatedMeal] = mealsRead;

        expect(updatedMeal!.mealId).toEqual(createdMeal!.mealId);
        expect(updatedMeal!.description).toEqual(mealUpdate.description);
        expect(updatedMeal!.sequence).toEqual(mealUpdate.sequence);
        expect(updatedMeal!.owner.userId).toEqual(user.userId);
        expect(updatedMeal!.source).toEqual(mealUpdate.source);
        expect(updatedMeal!.recipeId).toEqual(mealUpdate.recipeId);
        expect(updatedMeal!.heroImage!.attachmentId).toEqual(
            mealUpdate.heroImage,
        );
        expect(updatedMeal!.heroImage!.attachmentId).toEqual(
            updatedAttachment!.attachmentId,
        );
    });

    it("should not update a meal with a hero image owned by another user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: otherUser!.userId,
            attachments: [{}],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [{ description: uuid(), course: randomCourse() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({
                heroImage: attachment!.attachmentId,
            } satisfies components["schemas"]["CookListMealUpdate"]);

        expect(res.statusCode).toEqual(404);
        expect(res.body.fieldErrors).toEqual([
            {
                path: ["heroImage"],
                location: "body",
                code: "unknownReference",
                message: "Attachment not found",
            },
        ]);
    });

    it("should not update a meal with a recipe owned by another user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: otherUser!.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [{ description: uuid(), course: randomCourse() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({
                recipeId: recipe!.recipeId,
            } satisfies components["schemas"]["CookListMealUpdate"]);

        expect(res.statusCode).toEqual(404);
        expect(res.body.fieldErrors).toEqual([
            {
                path: ["recipeId"],
                location: "body",
                code: "unknownReference",
                message: "Recipe not found",
            },
        ]);
    });

    it("should delete the replaced attachment row and file when a meal hero image is replaced", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { fileRepository, deleteFile } = createSpyingFileRepository();
        app = createTestApp({ database, repositories: { fileRepository } });

        const {
            attachments: [originalAttachment, updatedAttachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}, {}],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                    heroImage: originalAttachment!.attachmentId,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({ heroImage: updatedAttachment!.attachmentId });

        expect(res.statusCode).toEqual(200);

        await purgeDeletedAttachments(database, fileRepository);

        const attachmentRows =
            await database("attachment").select("attachmentId");
        expect(
            attachmentRows.map(({ attachmentId }) => attachmentId).sort(),
        ).toEqual([updatedAttachment!.attachmentId].sort());

        expect(
            deleteFile.mock.calls.map(
                ({ arguments: [, request] }) => request.attachmentId,
            ),
        ).toEqual([originalAttachment!.attachmentId]);
    });

    it("should delete the attachment row and file when a meal hero image is cleared", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { fileRepository, deleteFile } = createSpyingFileRepository();
        app = createTestApp({ database, repositories: { fileRepository } });

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                    heroImage: attachment!.attachmentId,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({ heroImage: null });

        expect(res.statusCode).toEqual(200);

        await purgeDeletedAttachments(database, fileRepository);

        const attachmentRows =
            await database("attachment").select("attachmentId");
        expect(attachmentRows).toHaveLength(0);

        expect(
            deleteFile.mock.calls.map(
                ({ arguments: [, request] }) => request.attachmentId,
            ),
        ).toEqual([attachment!.attachmentId]);
    });

    it("should clear optional fields when set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 1,
                    source: uuid(),
                    recipeId: recipe!.recipeId,
                    heroImage: attachment!.attachmentId,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({
                description: null,
                sequence: null,
                source: null,
                recipeId: null,
                heroImage: null,
            });

        expect(res.statusCode).toEqual(200);
        const updatedMeal = res.body as components["schemas"]["CookListMeal"];
        expect(updatedMeal.description).toBeUndefined();
        expect(updatedMeal.sequence).toBeUndefined();
        expect(updatedMeal.source).toBeUndefined();
        expect(updatedMeal.recipeId).toBeUndefined();
        expect(updatedMeal.heroImage).toBeUndefined();
    });

    it("should fail to update a meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const mealUpdate = {
            description: uuid(),
            sequence: randomNumber(),
            source: uuid(),
        } satisfies components["schemas"]["CookListMealUpdate"];

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send(mealUpdate);
        expect(res.statusCode).toEqual(404);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            {
                userId: otherUser!.userId,
            },
        );

        expect(mealsRead.length).toEqual(1);

        const [unchangedMeal] = mealsRead;

        expect(unchangedMeal!.description).toEqual(createdMeal!.description);
    });

    it("should fail to update a planner meal via cooklist endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send({ description: "Updated" });

        expect(res.statusCode).toEqual(404);
    });

    const invalidMealUpdates: ReadonlyArray<{
        name: string;
        body: string | object;
    }> = [
        {
            name: "should fail if the request contains extraneous properties",
            body: { description: uuid(), extra: "invalid" },
        },
        {
            name: "should fail if the request contains invalid properties",
            body: { course: "invalid_course" },
        },
        {
            name: "should fail if a required field is set to null",
            body: { course: null },
        },
    ];

    for (const { name, body } of invalidMealUpdates) {
        it(name, async () => {
            const [token, user] = await PrepareAuthenticatedUser(database);

            const {
                meals: [meal],
            } = await KnexCookListRepository.createMeals(database, {
                userId: user.userId,
                meals: [{ course: randomCourse(), description: uuid() }],
            });

            const res = await request(app)
                .patch(`/v1/cooklist/meals/${meal!.mealId}`)
                .set(token)
                .send(body);

            expect(res.statusCode).toEqual(400);
        });
    }
});

describe("Remove meal from cook list", () => {
    it("should delete a meal belonging to the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(204);

        const { meals: mealsAfterDeletion } =
            await KnexCookListRepository.readAllMeals(database, {
                userId: user.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(0);
    });

    it("should delete the hero image attachment row and file when a meal is removed", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { fileRepository, deleteFile } = createSpyingFileRepository();
        app = createTestApp({ database, repositories: { fileRepository } });

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{}],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 0,
                    source: uuid(),
                    heroImage: attachment!.attachmentId,
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        await purgeDeletedAttachments(database, fileRepository);

        const attachmentRows =
            await database("attachment").select("attachmentId");
        expect(attachmentRows).toHaveLength(0);

        expect(
            deleteFile.mock.calls.map(
                ({ arguments: [, request] }) => request.attachmentId,
            ),
        ).toEqual([attachment!.attachmentId]);
    });

    it("should not delete a meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);

        const { meals: mealsAfterDeletion } =
            await KnexCookListRepository.readAllMeals(database, {
                userId: otherUser!.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(1);
    });

    it("should fail to delete a planner meal via cooklist endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});

describe("Get cook list meals", () => {
    it("should return cook list meals for a user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(token);

        expect(res.statusCode).toEqual(200);

        const cookListMealData =
            res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(1);

        const [meal] = cookListMealData;

        expect(meal!.mealId).toEqual(createdMeal!.mealId);
        expect(meal!.description).toEqual(createdMeal!.description);
        expect(meal!.source).toEqual(createdMeal!.source);
        expect(meal!.sequence).toEqual(createdMeal!.sequence);
        expect(meal!.owner.userId).toEqual(user.userId);
        expect(meal!.recipeId).toEqual(undefined);
    });

    it("should not return cook list meals for other users", async () => {
        const [_, user] = await PrepareAuthenticatedUser(database);
        const [otherUserToken] = await PrepareAuthenticatedUser(database);

        await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .get("/v1/cooklist/meals")
            .set(otherUserToken);

        expect(res.statusCode).toEqual(200);

        const cookListMealData =
            res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(0);
    });

    it("should not return planner meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0);
    });
});
