import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { components } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomNumber,
    randomYear,
} from "../helpers/index.ts";
import { randomCourse } from "../helpers/meal.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

let {
    app,
    attachmentRepository,
    cooklistRepository,
    plannerRepository,
    recipeRepository,
    userRepository,
} = TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({
        app,
        attachmentRepository,
        cooklistRepository,
        plannerRepository,
        recipeRepository,
        userRepository,
    } = createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Add meal to cook list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post("/v1/cooklist/meals");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should create a new meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachment],
        } = await attachmentRepository.create({
            userId: user.userId,
            attachments: [{ uri: uuid() }],
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

        const { meals: mealsRead } =
            await cooklistRepository.readAllMeals(user);

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
            expect(meal.heroImage!.uri).toEqual(attachment!.uri);
        });
    });

    withCxIt("should create a new meal with a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
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

        const { meals: mealsRead } =
            await cooklistRepository.readAllMeals(user);
        expect(mealsRead).toHaveLength(1);
        expect(mealsRead[0]!.recipeId).toEqual(recipe!.recipeId);
    });

    withCxIt("should create multiple cooklist meals", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);

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

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);

            const res = await request(app)
                .post("/v1/cooklist/meals")
                .set(token)
                .send({
                    description: uuid(),
                    course: randomCourse(),
                    extra: "invalid",
                });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);

            const res = await request(app)
                .post("/v1/cooklist/meals")
                .set(token)
                .send({
                    description: uuid(),
                    course: "invalid_course",
                });

            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should return 400 if the request body is an empty array",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);

            const res = await request(app)
                .post("/v1/cooklist/meals")
                .set(token)
                .send([]);

            expect(res.statusCode).toEqual(400);
        },
    );
});

describe("Update meal in cook list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).patch(`/v1/cooklist/meals/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should update the meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [originalAttachment, updatedAttachment],
        } = await attachmentRepository.create({
            userId: user.userId,
            attachments: [{ uri: uuid() }, { uri: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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

        const { meals: mealsRead } = await cooklistRepository.readAllMeals({
            userId: user.userId,
        });

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
        expect(updatedMeal!.heroImage!.uri).toEqual(updatedAttachment!.uri);
    });

    withCxIt("should clear optional fields when set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachment],
        } = await attachmentRepository.create({
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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

    withCxIt(
        "should fail to update a meal belonging to another user",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const [otherUser] = await CreateUsers(userRepository);

            const {
                meals: [createdMeal],
            } = await cooklistRepository.createMeals({
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

            const { meals: mealsRead } = await cooklistRepository.readAllMeals({
                userId: otherUser!.userId,
            });

            expect(mealsRead.length).toEqual(1);

            const [unchangedMeal] = mealsRead;

            expect(unchangedMeal!.description).toEqual(
                createdMeal!.description,
            );
        },
    );

    withCxIt(
        "should fail to update a planner meal via cooklist endpoint",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                planners: [planner],
            } = await plannerRepository.create({
                userId: user.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            const {
                meals: [plannerMeal],
            } = await plannerRepository.createMeals({
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
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                meals: [meal],
            } = await cooklistRepository.createMeals({
                userId: user.userId,
                meals: [{ course: randomCourse(), description: uuid() }],
            });

            const res = await request(app)
                .patch(`/v1/cooklist/meals/${meal!.mealId}`)
                .set(token)
                .send({
                    description: uuid(),
                    extra: "invalid",
                });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                meals: [meal],
            } = await cooklistRepository.createMeals({
                userId: user.userId,
                meals: [{ course: randomCourse(), description: uuid() }],
            });

            const res = await request(app)
                .patch(`/v1/cooklist/meals/${meal!.mealId}`)
                .set(token)
                .send({
                    course: "invalid_course",
                });

            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            meals: [meal],
        } = await cooklistRepository.createMeals({
            userId: user.userId,
            meals: [{ course: randomCourse(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${meal!.mealId}`)
            .set(token)
            .send({ course: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Remove meal from cook list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).delete(`/v1/cooklist/meals/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should delete a meal belonging to the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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
            await cooklistRepository.readAllMeals({
                userId: user.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(0);
    });

    withCxIt("should not delete a meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const [otherUser] = await CreateUsers(userRepository);

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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
            await cooklistRepository.readAllMeals({
                userId: otherUser!.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(1);
    });

    withCxIt(
        "should fail to delete a planner meal via cooklist endpoint",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                planners: [planner],
            } = await plannerRepository.create({
                userId: user.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            const {
                meals: [plannerMeal],
            } = await plannerRepository.createMeals({
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
        },
    );
});

describe("Get cook list meals", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/cooklist/meals");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return cook list meals for a user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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

    withCxIt("should not return cook list meals for other users", async () => {
        const [_, user] = await PrepareAuthenticatedUser(userRepository);
        const [otherUserToken] = await PrepareAuthenticatedUser(userRepository);

        await cooklistRepository.createMeals({
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

    withCxIt("should not return planner meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            planners: [planner],
        } = await plannerRepository.create({
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await plannerRepository.createMeals({
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
