import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { components, paths } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    createRandomRecipeTags,
    generateRandomRecipeIngredientSections,
    generateRandomRecipeMethodSections,
    generateRandomRecipeServings,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomElement,
    randomNumber,
    runTestCases,
    TEST_ITEM_COUNT,
    type TestCase,
} from "../helpers/index.ts";
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
    bookRepository,
    ingredientRepository,
    recipeRepository,
    tagRepository,
    userRepository,
} = TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({
        app,
        attachmentRepository,
        bookRepository,
        ingredientRepository,
        recipeRepository,
        tagRepository,
        userRepository,
    } = createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Get recipes", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return correct recipe details", async () => {
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
            userId: user!.userId,
            recipes: [
                {
                    name: uuid(),
                    rating: randomNumber(),
                    photo: attachment,
                },
            ],
        });

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        expect(data!.length).toEqual(1);

        const [recipeResponse] =
            data as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"]["recipes"];

        expect(recipeResponse!.recipeId).toEqual(recipe!.recipeId);
        expect(recipeResponse!.owner.userId).toEqual(user.userId);
        expect(recipeResponse!.owner.firstName).toEqual(user.firstName);
        expect(recipeResponse!.name).toEqual(recipe!.name);
        expect(recipeResponse!.rating?.personal).toEqual(
            recipe!.rating!.personal,
        );
        expect(recipeResponse!.rating?.average).toEqual(
            recipe!.rating!.personal,
        );
        expect(recipeResponse!.photo?.attachmentId).toEqual(
            attachment!.attachmentId,
        );
        expect(recipeResponse!.photo?.uri).toEqual(attachment!.uri);
    });

    withCxIt("should return all public recipes from other users", async () => {
        const [token, _] = await PrepareAuthenticatedUser(userRepository);
        const randomUsers = await CreateUsers(userRepository, {
            count: randomNumber(),
        });
        const allCreatedRecipes = [];
        for (const user of randomUsers) {
            const { recipes } = await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });
            allCreatedRecipes.push(...recipes);
        }

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        expect(data!.length).toEqual(allCreatedRecipes.length);
    });

    withCxIt("should not return private recipes", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const randomUsers = await CreateUsers(userRepository, {
            count: randomNumber(),
        });
        const otherUsersRecipes = [];
        for (const otherUser of randomUsers) {
            const { recipes } = await recipeRepository.create({
                userId: otherUser.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            });
            otherUsersRecipes.push(...recipes);
        }

        const { recipes: myRecipes } = await recipeRepository.create({
            userId: user.userId,
            recipes: Array.from({ length: randomNumber() }).map(() => ({
                name: uuid(),
                public: randomBoolean(),
            })),
        });

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        const expectedCount =
            myRecipes.length +
            otherUsersRecipes.filter((recipe) => recipe.public).length;
        expect(data!.length).toEqual(expectedCount);
    });

    withCxIt("should respect pagination", async () => {
        const PAGE_SIZE = 50;

        const [token, _] = await PrepareAuthenticatedUser(userRepository);
        const randomUsers = await CreateUsers(userRepository, {
            count: 6,
        });
        for (const user of randomUsers) {
            await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: 10 }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });
        }

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(data!.length).toEqual(PAGE_SIZE);

        const resPage2 = await request(app)
            .get("/v1/recipes")
            .query({ page: 2 })
            .set(token);

        expect(resPage2.statusCode).toEqual(200);

        const { recipes: dataPage2 } =
            resPage2.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(dataPage2!.length).toEqual(10);

        const page1Ids = data!.map((r) => r.recipeId);
        const duplicateRecipeKeys = dataPage2!.filter((r) =>
            page1Ids.includes(r.recipeId),
        );

        expect(duplicateRecipeKeys.length).toEqual(0);
    });

    describe("filter", () => {
        withCxIt("should return results by owner", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const randomUsers = await CreateUsers(userRepository, {
                count: randomNumber(),
            });

            for (const randomUser of randomUsers) {
                await recipeRepository.create({
                    userId: randomUser.userId,
                    recipes: Array.from({ length: randomNumber(1, 3) }).map(
                        () => ({
                            name: uuid(),
                            public: true,
                        }),
                    ),
                });
            }

            const { recipes: myRecipes } = await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: randomNumber() }).map(() => ({
                    name: uuid(),
                })),
            });

            const res = await request(app)
                .get("/v1/recipes")
                .query({ owner: user.userId })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } = res.body;

            expect(data!.length).toEqual(myRecipes.length);
        });

        withCxIt("should return results by name match", async () => {
            const [token, _] = await PrepareAuthenticatedUser(userRepository);
            const randomUsers = await CreateUsers(userRepository, {
                count: 10,
            });
            const allCreatedRecipes = [];
            for (const user of randomUsers) {
                const { recipes } = await recipeRepository.create({
                    userId: user.userId,
                    recipes: Array.from({ length: 10 }).map(() => ({
                        name: uuid(),
                        public: true,
                    })),
                });
                allCreatedRecipes.push(...recipes);
            }

            const recipeToSearchBy = randomElement(allCreatedRecipes)!;

            const res = await request(app)
                .get("/v1/recipes")
                .query({ search: recipeToSearchBy.name })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            const [recipe] = data!;

            expect(data!.length).toEqual(1);
            expect(recipe!.recipeId).toEqual(recipeToSearchBy.recipeId);
        });

        withCxIt("should return results by name substring", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                recipes: [recipe],
            } = await recipeRepository.create({
                userId: user.userId,
                recipes: [
                    {
                        name: "Hardcoded Recipe Title To Search By",
                        public: true,
                    },
                    { name: "z", public: true },
                ],
            });

            const resPrefix = await request(app)
                .get("/v1/recipes")
                .query({
                    search: recipe!.name.substring(0, randomNumber() * 2),
                })
                .set(token);

            expect(resPrefix.statusCode).toEqual(200);

            const { recipes: dataPrefix } =
                resPrefix.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(dataPrefix![0]!.recipeId).toEqual(recipe!.recipeId);

            const resSuffix = await request(app)
                .get("/v1/recipes")
                .query({ search: recipe!.name.substring(randomNumber()) })
                .set(token);

            expect(resSuffix.statusCode).toEqual(200);

            const { recipes: dataSuffix } =
                resSuffix.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(dataSuffix![0]!.recipeId).toEqual(recipe!.recipeId);

            const resMiddle = await request(app)
                .get("/v1/recipes")
                .query({
                    search: recipe!.name.substring(
                        randomNumber(10, 1),
                        randomNumber(20, 11),
                    ),
                })
                .set(token);

            expect(resMiddle.statusCode).toEqual(200);

            const { recipes: dataMiddle } =
                resMiddle.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(dataMiddle![0]!.recipeId).toEqual(recipe!.recipeId);
        });

        withCxIt("should return results by category", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const [parentTag] = await tagRepository.create({
                name: uuid(),
            });

            const childTags = await tagRepository.create([
                { parentId: parentTag!.tagId, name: "child-1" },
                { parentId: parentTag!.tagId, name: "child-2" },
                { parentId: parentTag!.tagId, name: "child-3" },
            ]);

            const { recipes } = await recipeRepository.create({
                userId: user.userId,
                recipes: [
                    { name: uuid(), public: true, tags: [childTags[0]!] },
                    { name: uuid(), public: true, tags: [childTags[1]!] },
                    { name: uuid(), public: true, tags: [childTags[2]!] },
                    { name: uuid(), public: true, tags: [childTags[0]!] },
                    { name: uuid(), public: true },
                ],
            });

            const tagsToFilterBy = [childTags[0]!.tagId, childTags[1]!.tagId];

            const res = await request(app)
                .get("/v1/recipes")
                .query({ tags: tagsToFilterBy })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            const expectedRecipeIds = recipes
                .filter(({ tags }) =>
                    Object.values(tags ?? {}).some((tagGroup) =>
                        (tagGroup.tags ?? []).some((t) =>
                            tagsToFilterBy.includes(t.tagId),
                        ),
                    ),
                )
                .map((r) => r.recipeId);

            const actualRecipeIds = data!.map(({ recipeId }) => recipeId);

            expect(actualRecipeIds.sort()).toEqual(expectedRecipeIds.sort());
            expect(actualRecipeIds.length).toEqual(3);
        });

        withCxIt("should respect ingredient filtering", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { ingredients } = await ingredientRepository.create({
                userId: user.userId,
                ingredients: [{ name: "IngredientA" }, { name: "IngredientB" }],
            });

            const [includedIngredient, excludedIngredient] = ingredients;

            const ingredientsToFilterBy = [includedIngredient!.ingredientId];

            const { recipes } = await recipeRepository.create({
                userId: user.userId,
                recipes: [
                    {
                        name: uuid(),
                        public: true,
                        ingredients: [
                            {
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                includedIngredient!
                                                    .ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: uuid(),
                        public: true,
                        ingredients: [
                            {
                                name: "custom section",
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                includedIngredient!
                                                    .ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: uuid(),
                        public: true,
                        ingredients: [
                            {
                                name: "custom section",
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                excludedIngredient!
                                                    .ingredientId,
                                        },
                                    },
                                ],
                            },
                            {
                                name: "second section",
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                includedIngredient!
                                                    .ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: uuid(),
                        public: true,
                        ingredients: [
                            {
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                excludedIngredient!
                                                    .ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    { name: uuid(), public: true },
                ],
            });

            const res = await request(app)
                .get("/v1/recipes")
                .query({ ingredients: ingredientsToFilterBy })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            const expectedRecipeIds = recipes
                .filter((recipe) =>
                    recipe.ingredients?.some(({ items }) =>
                        items.some((item) =>
                            "ingredient" in item
                                ? item.ingredient?.ingredientId ===
                                  includedIngredient!.ingredientId
                                : false,
                        ),
                    ),
                )
                .map((r) => r.recipeId);

            const actualRecipeIds = data!.map(({ recipeId }) => recipeId);

            expect(actualRecipeIds.sort()).toEqual(expectedRecipeIds.sort());
            expect(actualRecipeIds.length).toEqual(3);
        });

        withCxIt(
            "should respect all filters simultaneously with AND logic",
            async () => {
                const [token, { userId }] =
                    await PrepareAuthenticatedUser(userRepository);
                const [_, otherOwner] =
                    await PrepareAuthenticatedUser(userRepository);

                const name = uuid();

                const [tag] = await tagRepository.create({
                    name: "tag",
                });

                const {
                    ingredients: [ingredient],
                } = await ingredientRepository.create({
                    userId,
                    ingredients: [{ name: "ingredient" }],
                });

                const {
                    recipes: [targetRecipe],
                } = await recipeRepository.create({
                    userId,
                    recipes: [
                        {
                            name,
                            tags: [tag!],
                            ingredients: [{ items: [{ ingredient }] }],
                        },
                        {
                            name: uuid(),
                        },
                        {
                            name,
                        },
                        {
                            name: uuid(),
                            tags: [tag!],
                        },
                        {
                            name: uuid(),
                            ingredients: [{ items: [{ ingredient }] }],
                        },
                    ],
                });

                await recipeRepository.create({
                    userId: otherOwner.userId,
                    recipes: [
                        {
                            name,
                            tags: [tag!],
                            ingredients: [{ items: [{ ingredient }] }],
                        },
                    ],
                });

                const res = await request(app)
                    .get("/v1/recipes")
                    .query({
                        ingredients: [ingredient!.ingredientId],
                        tags: [tag!.tagId],
                        owner: userId,
                    })
                    .set(token);

                expect(res.statusCode).toEqual(200);

                const { recipes: data } =
                    res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

                expect(data.length).toEqual(1);
                expect(data[0]!.recipeId).toEqual(targetRecipe!.recipeId);
            },
        );

        withCxIt(
            "should not duplicate recipes when filtering by multiple books",
            async () => {
                const [_, user] =
                    await PrepareAuthenticatedUser(userRepository);

                const {
                    recipes: [recipe],
                } = await recipeRepository.create({
                    userId: user.userId,
                    recipes: [{ name: uuid() }],
                });

                const {
                    books: [book1, book2],
                } = await bookRepository.create({
                    userId: user.userId,
                    books: [{ name: uuid() }, { name: uuid() }],
                });

                await bookRepository.saveRecipes({
                    bookId: book1!.bookId,
                    recipes: [recipe!],
                });
                await bookRepository.saveRecipes({
                    bookId: book2!.bookId,
                    recipes: [recipe!],
                });

                const { recipes } = await recipeRepository.readAll({
                    userId: user.userId,
                    filter: { books: [book1!, book2!] },
                });

                expect(recipes).toHaveLength(1);
                expect(recipes[0]!.recipeId).toEqual(recipe!.recipeId);
            },
        );
    });

    describe("sorting/ordering", () => {
        withCxIt("should return results by name", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const order = randomBoolean() ? "asc" : "desc";

            await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });

            const res = await request(app)
                .get("/v1/recipes")
                .query({ sort: "name", order })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(data!.length).toEqual(TEST_ITEM_COUNT);

            const recipeNames = data!.map(({ name }) => name);
            expect(recipeNames).toEqual(
                order === "asc"
                    ? recipeNames.sort()
                    : recipeNames.sort().reverse(),
            );
        });

        withCxIt("should return results by rating", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const order = randomBoolean() ? "asc" : "desc";

            await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                    name: uuid(),
                    rating: randomNumber(),
                    public: true,
                })),
            });

            const res = await request(app)
                .get("/v1/recipes")
                .query({ sort: "ratingPersonal", order })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(data!.length).toEqual(TEST_ITEM_COUNT);

            const recipeRatings = data!.map(
                ({ rating }) => rating?.personal ?? 0,
            );
            expect(recipeRatings).toEqual(
                order === "asc"
                    ? recipeRatings!.sort()
                    : recipeRatings!.sort().reverse(),
            );
        });

        withCxIt("should return results by time", async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const order = randomBoolean() ? "asc" : "desc";

            await recipeRepository.create({
                userId: user.userId,
                recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                    name: uuid(),
                    prepTime: randomNumber(5),
                    public: true,
                })),
            });

            const res = await request(app)
                .get("/v1/recipes")
                .query({ sort: "cookTime", order })
                .set(token);

            expect(res.statusCode).toEqual(200);

            const { recipes: data } =
                res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

            expect(data!.length).toEqual(TEST_ITEM_COUNT);

            const recipeTimes = data!.map(({ prepTime }) => prepTime);
            expect(recipeTimes).toEqual(
                order === "asc"
                    ? recipeTimes.sort()
                    : recipeTimes.sort().reverse(),
            );
        });
    });
});

describe("Create a recipe", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should save correct basic details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachment],
        } = await attachmentRepository.create({
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const [parentTag, soloTag] = await tagRepository.create([
            { name: "parent" },
            { name: "solo" },
        ]);

        const [childTag] = await tagRepository.create({
            name: "child",
            parentId: parentTag!.tagId,
        });

        const recipe: components["schemas"]["RecipeCreate"] = {
            name: uuid(),
            public: randomBoolean(),
            prepTime: randomNumber(),
            cookTime: randomNumber(),
            servings: generateRandomRecipeServings(),
            summary: uuid(),
            source: uuid(),
            tips: uuid(),
            method: [],
            ingredients: [],
            timesCooked: randomNumber(),
            rating: randomNumber(),
            photo: attachment,
            tags: [{ tagId: childTag!.tagId }, { tagId: soloTag!.tagId }],
        };

        const res = await request(app)
            .post("/v1/recipes")
            .set(token)
            .send(recipe);

        expect(res.statusCode).toEqual(201);

        const response = res.body as components["schemas"]["Recipe"];

        expect(response!.name).toBe(recipe.name);
        expect(response!.public).toBe(recipe.public);
        expect(response!.prepTime).toBe(recipe.prepTime);
        expect(response!.cookTime).toStrictEqual(recipe.cookTime);
        expect(response!.servings).toStrictEqual(recipe.servings);
        expect(response!.summary).toBe(recipe.summary);
        expect(response!.source).toBe(recipe.source);
        expect(response!.tips).toBe(recipe.tips);
        expect(response!.timesCooked).toBe(recipe.timesCooked);
        expect(response!.rating!.personal).toBe(recipe.rating);
        expect(response!.rating!.average).toEqual(recipe.rating);
        expect(response!.photo!.attachmentId).toBe(attachment!.attachmentId);
        expect(response!.photo!.uri).toBe(attachment!.uri);
        expect(response!.tags).toStrictEqual({
            [parentTag!.tagId]: {
                tagId: parentTag!.tagId,
                name: parentTag!.name,
                tags: [{ tagId: childTag!.tagId, name: childTag!.name }],
            },
            [soloTag!.tagId]: {
                tagId: soloTag!.tagId,
                name: soloTag!.name,
            },
        });
        expect(response!.owner.userId).toBe(user.userId);
        expect(response!.owner.firstName).toBe(user.firstName);
    });

    describe("method", () => {
        const AnonymousSectionWithItem = {
            items: [{ content: "Item Description" }],
        };
        const AnonymousSectionWithItems = {
            items: [
                { content: "Item 1 Description" },
                { content: "Item 2 Description" },
                { content: "Item 3 Description" },
            ],
        };
        const NamedSectionWithItem = {
            name: "Section Name",
            description: "Section Description",
            items: [{ content: "Item Description" }],
        };

        const testCases: TestCase<
            components["schemas"]["Recipe"]["method"],
            components["schemas"]["RecipeCreate"]["method"]
        >[] = [
            {
                name: "should create recipe with no method",
                input: [],
                expected: [],
            },
            {
                name: "should create recipe with unnamed section with steps",
                input: [AnonymousSectionWithItem],
                expected: [AnonymousSectionWithItem],
            },
            {
                name: "should create recipe with named section with steps",
                input: [NamedSectionWithItem],
                expected: [NamedSectionWithItem],
            },
            {
                name: "should create recipe with correctly ordered steps",
                input: [AnonymousSectionWithItems],
                expected: [AnonymousSectionWithItems],
            },
            {
                name: "should create recipe with multiple named sections",
                input: [
                    NamedSectionWithItem,
                    {
                        name: "Section 2 Name",
                        description: "Section 2 Description",
                        items: [{ content: "Item Description" }],
                    },
                ],
                expected: [
                    NamedSectionWithItem,
                    {
                        name: "Section 2 Name",
                        description: "Section 2 Description",
                        items: [{ content: "Item Description" }],
                    },
                ],
            },
            {
                name: "should create recipe with default and named section",
                input: [AnonymousSectionWithItem, NamedSectionWithItem],
                expected: [AnonymousSectionWithItem, NamedSectionWithItem],
            },
        ];

        const baseRecipe: components["schemas"]["RecipeCreate"] = {
            name: uuid(),
        };

        runTestCases(testCases, async ({ input, expected }) => {
            const [token] = await PrepareAuthenticatedUser(userRepository);

            const res = await request(app)
                .post("/v1/recipes")
                .set(token)
                .send({ ...baseRecipe, method: input });

            expect(res.statusCode).toEqual(201);

            const response = res.body as components["schemas"]["Recipe"];

            expect(response.method).toStrictEqual(expected);
        });
    });

    describe("ingredients", () => {
        describe("content", () => {
            const AnonymousSectionWithItem = {
                items: [{ name: "Ingredient Name" }],
            };
            const AnonymousSectionWithItems = {
                items: [
                    { name: "Ingredient 1 Name" },
                    { name: "Ingredient 2 Name" },
                    { name: "Ingredient 3 Name" },
                ],
            };

            const NamedSectionWithItem = {
                name: "Section Name",
                description: "Section Description",
                items: [{ name: "Ingredient Name" }],
            };

            const testCases: TestCase<
                components["schemas"]["Recipe"]["ingredients"],
                components["schemas"]["RecipeCreate"]["ingredients"]
            >[] = [
                {
                    name: "should create recipe with no ingredients",
                    input: [],
                    expected: [],
                },
                {
                    name: "should create recipe with unnamed section with ingredients",
                    input: [AnonymousSectionWithItem],
                    expected: [AnonymousSectionWithItem],
                },
                {
                    name: "should create recipe with named section with ingredients",
                    input: [NamedSectionWithItem],
                    expected: [NamedSectionWithItem],
                },
                {
                    name: "should create recipe with correctly ordered ingredients",
                    input: [AnonymousSectionWithItems],
                    expected: [AnonymousSectionWithItems],
                },
                {
                    name: "should save multiple anonymous sections",
                    input: [
                        AnonymousSectionWithItem,
                        {
                            items: [{ name: "Ingredient (Section 2) Name" }],
                        },
                    ],
                    expected: [
                        AnonymousSectionWithItem,
                        {
                            items: [{ name: "Ingredient (Section 2) Name" }],
                        },
                    ],
                },
                {
                    name: "should create recipe with multiple named sections",
                    input: [
                        NamedSectionWithItem,
                        {
                            name: "Section 2 Name",
                            description: "Section 2 Description",
                            items: [{ name: "Ingredient 2 Name" }],
                        },
                    ],
                    expected: [
                        NamedSectionWithItem,
                        {
                            name: "Section 2 Name",
                            description: "Section 2 Description",
                            items: [{ name: "Ingredient 2 Name" }],
                        },
                    ],
                },
                {
                    name: "should create recipe with default and named section",
                    input: [AnonymousSectionWithItem, NamedSectionWithItem],
                    expected: [AnonymousSectionWithItem, NamedSectionWithItem],
                },
            ];

            const baseRecipe: components["schemas"]["RecipeCreate"] = {
                name: uuid(),
            };

            runTestCases(testCases, async ({ input, expected }) => {
                const [token] = await PrepareAuthenticatedUser(userRepository);

                const res = await request(app)
                    .post("/v1/recipes")
                    .set(token)
                    .send({ ...baseRecipe, ingredients: input });

                expect(res.statusCode).toEqual(201);

                const response = res.body as components["schemas"]["Recipe"];

                expect(response.ingredients).toStrictEqual(expected);
            });
        });

        describe("reference", () => {
            withCxIt("should save ingredient details", async () => {
                const [token, { userId }] =
                    await PrepareAuthenticatedUser(userRepository);

                const {
                    ingredients: [ingredientA],
                } = await ingredientRepository.create({
                    userId,
                    ingredients: [
                        { name: "ingredientA", namePlural: "ingredientsA" },
                    ],
                });

                const recipe: components["schemas"]["RecipeCreate"] = {
                    name: uuid(),
                    ingredients: [
                        {
                            items: [
                                {
                                    ingredient: {
                                        ingredientId: ingredientA!.ingredientId,
                                    },
                                },
                            ],
                        },
                    ],
                };

                const res = await request(app)
                    .post("/v1/recipes")
                    .set(token)
                    .send(recipe);

                expect(res.statusCode).toEqual(201);

                const response = res.body as components["schemas"]["Recipe"];

                const ingredientResponse =
                    response.ingredients![0]!.items[0]!.ingredient!;

                expect(ingredientResponse.name).toStrictEqual("ingredientA");
                expect(ingredientResponse.namePlural).toStrictEqual(
                    "ingredientsA",
                );
            });

            withCxIt("should save sub-recipe details", async () => {
                const [token, { userId }] =
                    await PrepareAuthenticatedUser(userRepository);

                const {
                    recipes: [recipeA],
                } = await recipeRepository.create({
                    userId,
                    recipes: [{ name: "recipeA" }],
                });

                const recipe: components["schemas"]["RecipeCreate"] = {
                    name: uuid(),
                    ingredients: [
                        {
                            items: [
                                {
                                    recipe: {
                                        recipeId: recipeA!.recipeId,
                                    },
                                },
                            ],
                        },
                    ],
                };

                const res = await request(app)
                    .post("/v1/recipes")
                    .set(token)
                    .send(recipe);

                expect(res.statusCode).toEqual(201);

                const response = res.body as components["schemas"]["Recipe"];

                const subRecipeResponse =
                    response.ingredients![0]!.items[0]!.recipe!;

                expect(subRecipeResponse.name).toStrictEqual("recipeA");
            });
        });
    });
});

describe("Update a recipe", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should not allow editing if not recipe owner", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const [recipeOwner] = await CreateUsers(userRepository);

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: recipeOwner!.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({ name: "recipe" });

        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should update basic recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachment1, attachment2],
        } = await attachmentRepository.create({
            userId: user.userId,
            attachments: [{ uri: uuid() }, { uri: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [
                {
                    cookTime: randomNumber(),
                    method: generateRandomRecipeMethodSections(),
                    name: uuid(),
                    photo: attachment1,
                    prepTime: randomNumber(),
                    public: randomBoolean(),
                    rating: randomNumber(),
                    servings: generateRandomRecipeServings(),
                    source: uuid(),
                    summary: uuid(),
                    tags: await createRandomRecipeTags(tagRepository),
                    timesCooked: randomNumber(),
                    tips: uuid(),
                },
            ],
        });

        const updatedTags = await tagRepository.create(
            Array.from({ length: randomNumber() }).map(() => ({
                name: uuid(),
                description: uuid(),
            })),
        );

        const updatedRecipe: components["schemas"]["RecipeUpdate"] = {
            cookTime: randomNumber(),
            method: generateRandomRecipeMethodSections(),
            name: uuid(),
            photo: attachment2,
            prepTime: randomNumber(),
            public: !recipe!.public,
            rating: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            summary: uuid(),
            tags: updatedTags.map(({ tagId }) => ({ tagId })),
            timesCooked: randomNumber(),
            tips: uuid(),
        };

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send(updatedRecipe);

        expect(res.statusCode).toEqual(200);

        const {
            recipes: [recipeResponse],
        } = await recipeRepository.read({
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });

        expect(recipeResponse!.cookTime).toEqual(updatedRecipe.cookTime);
        expect(recipeResponse!.method).toEqual(updatedRecipe.method);
        expect(recipeResponse!.name).toEqual(updatedRecipe.name);
        expect(recipeResponse!.owner.firstName).toEqual(user.firstName);
        expect(recipeResponse!.owner.userId).toEqual(user.userId);
        expect(recipeResponse!.prepTime).toEqual(updatedRecipe.prepTime);
        expect(recipeResponse!.public).toEqual(updatedRecipe.public);
        expect(recipeResponse!.rating!.average).toEqual(updatedRecipe.rating);
        expect(recipeResponse!.rating!.personal).toEqual(updatedRecipe.rating);
        expect(recipeResponse!.servings).toEqual(updatedRecipe.servings);
        expect(recipeResponse!.source).toEqual(updatedRecipe.source);
        expect(recipeResponse!.summary).toEqual(updatedRecipe.summary);
        expect(recipeResponse!.timesCooked).toEqual(updatedRecipe.timesCooked);
        expect(recipeResponse!.tips).toEqual(updatedRecipe.tips);
        expect(recipeResponse!.photo!.attachmentId).toEqual(
            attachment2!.attachmentId,
        );
        expect(recipeResponse!.photo!.uri).toEqual(attachment2!.uri);
        expect(Object.keys(recipeResponse!.tags ?? {}).sort()).toStrictEqual(
            updatedTags.map(({ tagId }) => tagId).sort(),
        );
    });

    withCxIt("should clear basic nullable fields", async () => {
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
            recipes: [
                {
                    cookTime: randomNumber(),
                    method: generateRandomRecipeMethodSections(),
                    name: uuid(),
                    nutritionalInformation: {},
                    photo: attachment,
                    prepTime: randomNumber(),
                    public: true,
                    rating: randomNumber(),
                    servings: generateRandomRecipeServings(),
                    source: uuid(),
                    summary: uuid(),
                    tags: await createRandomRecipeTags(tagRepository),
                    timesCooked: randomNumber(),
                    tips: uuid(),
                },
            ],
        });

        const recipeUpdate: components["schemas"]["RecipeUpdate"] = {
            cookTime: null,
            method: null,
            nutritionalInformation: null,
            photo: null,
            prepTime: null,
            public: null,
            rating: null,
            servings: null,
            source: null,
            summary: null,
            tags: null,
            timesCooked: null,
            tips: null,
        };

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send(recipeUpdate);

        expect(res.statusCode).toEqual(200);

        const {
            recipes: [updatedRecipe],
        } = await recipeRepository.read({
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });

        expect(updatedRecipe!.cookTime).toBeUndefined();
        expect(updatedRecipe!.method).toBeUndefined();
        expect(updatedRecipe!.name).toEqual(recipe!.name);
        expect(updatedRecipe!.nutritionalInformation).toBeUndefined();
        expect(updatedRecipe!.photo).toBeUndefined();
        expect(updatedRecipe!.prepTime).toBeUndefined();
        expect(updatedRecipe!.public).toBeUndefined();
        expect(updatedRecipe!.rating.average).toBeUndefined();
        expect(updatedRecipe!.rating.personal).toBeUndefined();
        expect(updatedRecipe!.recipeId).toEqual(recipe!.recipeId);
        expect(updatedRecipe!.servings).toBeUndefined();
        expect(updatedRecipe!.source).toBeUndefined();
        expect(updatedRecipe!.summary).toBeUndefined();
        expect(updatedRecipe!.timesCooked).toBeUndefined();
        expect(updatedRecipe!.tips).toBeUndefined();
        expect(updatedRecipe!.tags).toBeUndefined();
    });

    describe("ingredients", () => {
        const itemA = { name: "A" };
        const itemB = { name: "B" };
        const itemC = { name: "C" };
        const RowA = { name: "A", items: [itemA] };
        const RowB = { name: "B", items: [itemB] };
        const RowC = { name: "C", items: [itemC] };
        const testCases: TestCase<
            components["schemas"]["Recipe"]["ingredients"],
            components["schemas"]["RecipeCreate"]["ingredients"],
            components["schemas"]["RecipeUpdate"]["ingredients"]
        >[] = [
            {
                name: "should add an ingredient section",
                input: [RowA, RowB],
                update: [RowA, RowC, RowB],
                expected: [RowA, RowC, RowB],
            },
            {
                name: "should remove an ingredient section",
                input: [RowA, RowB, RowC],
                update: [RowA, RowC],
                expected: [RowA, RowC],
            },
            {
                name: "should reorder an ingredient section",
                input: [RowA, RowB, RowC],
                update: [RowA, RowC, RowB],
                expected: [RowA, RowC, RowB],
            },
            {
                name: "should add an ingredient section ingredient",
                input: [RowA, RowB],
                update: [{ ...RowA, items: [...RowA.items, itemC] }, RowB],
                expected: [{ ...RowA, items: [...RowA.items, itemC] }, RowB],
            },
            {
                name: "should update an ingredient section ingredient",
                input: [RowA, RowB],
                update: [{ ...RowA, items: [itemC] }, RowB],
                expected: [{ ...RowA, items: [itemC] }, RowB],
            },
            {
                name: "should remove an ingredient section ingredient",
                input: [RowA, RowB],
                update: [{ ...RowA, items: [] }, RowB],
                expected: [{ ...RowA, items: [] }, RowB],
            },
            {
                name: "should reorder an ingredient section ingredient",
                input: [{ items: [itemA, itemB, itemC] }, RowB],
                update: [{ items: [itemA, itemC, itemB] }, RowB],
                expected: [{ items: [itemA, itemC, itemB] }, RowB],
            },
            {
                name: "should clear ingredients",
                input: [RowA],
                update: null,
                expected: undefined,
            },
        ];

        runTestCases(testCases, async ({ input, update, expected }) => {
            const [token, { userId }] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                recipes: [baseRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [{ name: uuid(), ingredients: input }],
            });

            const res = await request(app)
                .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                .set(token)
                .send({ ingredients: update });

            expect(res.statusCode).toEqual(200);

            const response = res.body as components["schemas"]["Recipe"];

            expect(response.ingredients).toStrictEqual(expected);
        });
    });

    describe("ingredient ingredient reference", () => {
        withCxIt("should add reference", async () => {
            const [token, { userId }] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                ingredients: [ingredientA],
            } = await ingredientRepository.create({
                userId,
                ingredients: [
                    { name: "IngredientA", namePlural: "IngredientsA" },
                ],
            });

            const {
                recipes: [baseRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [
                    {
                        name: uuid(),
                        ingredients: [{ items: [{ name: "ingredientA" }] }],
                    },
                ],
            });

            const res = await request(app)
                .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                .set(token)
                .send({
                    ingredients: [
                        {
                            items: [
                                {
                                    name: "ingredientA",
                                    ingredient: {
                                        ingredientId: ingredientA!.ingredientId,
                                    },
                                },
                            ],
                        },
                    ],
                });

            expect(res.statusCode).toEqual(200);

            const response = res.body as components["schemas"]["Recipe"];

            const responseIngredientItem = response.ingredients![0]!.items![0]!;

            expect(responseIngredientItem.name).toStrictEqual("ingredientA");
            expect(
                responseIngredientItem.ingredient!.ingredientId,
            ).toStrictEqual(ingredientA!.ingredientId);
            expect(responseIngredientItem.ingredient!.name).toStrictEqual(
                ingredientA!.name,
            );
            expect(responseIngredientItem.ingredient!.namePlural).toStrictEqual(
                ingredientA!.namePlural,
            );
        });

        withCxIt("should remove reference", async () => {
            const [token, { userId }] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                ingredients: [ingredientA],
            } = await ingredientRepository.create({
                userId,
                ingredients: [
                    { name: "IngredientA", namePlural: "IngredientsA" },
                ],
            });

            const {
                recipes: [baseRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [
                    {
                        name: uuid(),
                        ingredients: [
                            {
                                items: [
                                    {
                                        name: "ingredientA",
                                        ingredient: {
                                            ingredientId:
                                                ingredientA!.ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            const res = await request(app)
                .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                .set(token)
                .send({
                    ingredients: [
                        {
                            items: [
                                {
                                    name: "ingredientA",
                                },
                            ],
                        },
                    ],
                });

            expect(res.statusCode).toEqual(200);

            const response = res.body as components["schemas"]["Recipe"];

            const responseIngredientItem = response.ingredients![0]!.items![0]!;

            expect(responseIngredientItem.name).toStrictEqual("ingredientA");
            expect(responseIngredientItem.ingredient).toBeUndefined();
        });

        withCxIt(
            "should not affect other recipe ingredient references",
            async () => {
                const [token, { userId }] =
                    await PrepareAuthenticatedUser(userRepository);

                const {
                    ingredients: [ingredientA, ingredientB],
                } = await ingredientRepository.create({
                    userId,
                    ingredients: [
                        { name: "IngredientA", namePlural: "IngredientsA" },
                        { name: "IngredientB", namePlural: "IngredientsB" },
                    ],
                });

                const {
                    recipes: [baseRecipe, otherRecipe],
                } = await recipeRepository.create({
                    userId,
                    recipes: [
                        {
                            name: uuid(),
                            ingredients: [
                                {
                                    items: [
                                        {
                                            name: "ingredientA",
                                            ingredient: {
                                                ingredientId:
                                                    ingredientA!.ingredientId,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            name: uuid(),
                            ingredients: [
                                {
                                    items: [
                                        {
                                            name: "ingredientA",
                                            ingredient: {
                                                ingredientId:
                                                    ingredientA!.ingredientId,
                                            },
                                        },
                                        {
                                            name: "ingredientB",
                                            ingredient: {
                                                ingredientId:
                                                    ingredientB!.ingredientId,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });

                const res = await request(app)
                    .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                    .set(token)
                    .send({
                        ingredients: [
                            {
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                ingredientB!.ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    });

                expect(res.statusCode).toEqual(200);

                const response = res.body as components["schemas"]["Recipe"];

                const responseIngredientItem =
                    response.ingredients![0]!.items![0]!;

                expect(
                    responseIngredientItem.ingredient!.ingredientId,
                ).toStrictEqual(ingredientB!.ingredientId);

                const {
                    recipes: [otherRecipePostRequest],
                } = await recipeRepository.read({
                    userId,
                    recipes: [otherRecipe!],
                });

                expect(otherRecipe).toStrictEqual(otherRecipePostRequest);
            },
        );
    });

    describe("ingredient recipe reference", () => {
        withCxIt("should add reference", async () => {
            const [token, { userId }] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                recipes: [subRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [{ name: uuid() }],
            });

            const {
                recipes: [baseRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [
                    {
                        name: uuid(),
                        ingredients: [{ items: [{ name: "ingredientA" }] }],
                    },
                ],
            });

            const res = await request(app)
                .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                .set(token)
                .send({
                    ingredients: [
                        {
                            items: [
                                {
                                    name: "ingredientA",
                                    recipe: { recipeId: subRecipe!.recipeId },
                                },
                            ],
                        },
                    ],
                });

            expect(res.statusCode).toEqual(200);

            const response = res.body as components["schemas"]["Recipe"];

            const responseIngredientItem = response.ingredients![0]!.items![0]!;

            expect(responseIngredientItem.name).toStrictEqual("ingredientA");
            expect(responseIngredientItem.recipe!.recipeId).toStrictEqual(
                subRecipe!.recipeId,
            );
            expect(responseIngredientItem.recipe!.name).toStrictEqual(
                subRecipe!.name,
            );
        });

        withCxIt("should remove reference", async () => {
            const [token, { userId }] =
                await PrepareAuthenticatedUser(userRepository);

            const {
                recipes: [subRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [{ name: uuid() }],
            });

            const {
                recipes: [baseRecipe],
            } = await recipeRepository.create({
                userId,
                recipes: [
                    {
                        name: uuid(),
                        ingredients: [
                            {
                                items: [
                                    {
                                        name: "recipeA",
                                        recipe: {
                                            recipeId: subRecipe!.recipeId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            const res = await request(app)
                .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                .set(token)
                .send({
                    ingredients: [
                        {
                            items: [
                                {
                                    name: "recipeA",
                                },
                            ],
                        },
                    ],
                });

            expect(res.statusCode).toEqual(200);

            const response = res.body as components["schemas"]["Recipe"];

            const responseIngredientItem = response.ingredients![0]!.items![0]!;

            expect(responseIngredientItem.name).toStrictEqual("recipeA");
            expect(responseIngredientItem.recipe).toBeUndefined();
        });

        withCxIt(
            "should not affect other recipe recipe references",
            async () => {
                const [token, { userId }] =
                    await PrepareAuthenticatedUser(userRepository);

                const {
                    recipes: [subRecipeA, subRecipeB],
                } = await recipeRepository.create({
                    userId,
                    recipes: [{ name: uuid() }, { name: uuid() }],
                });

                const {
                    recipes: [baseRecipe, otherRecipe],
                } = await recipeRepository.create({
                    userId,
                    recipes: [
                        {
                            name: uuid(),
                            ingredients: [
                                {
                                    items: [
                                        {
                                            recipe: {
                                                recipeId: subRecipeA!.recipeId,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            name: uuid(),
                            ingredients: [
                                {
                                    items: [
                                        {
                                            recipe: {
                                                recipeId: subRecipeA!.recipeId,
                                            },
                                        },
                                        {
                                            recipe: {
                                                recipeId: subRecipeB!.recipeId,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });

                const res = await request(app)
                    .patch(`/v1/recipes/${baseRecipe!.recipeId}`)
                    .set(token)
                    .send({
                        ingredients: [
                            {
                                items: [
                                    {
                                        recipe: {
                                            recipeId: subRecipeB!.recipeId,
                                        },
                                    },
                                ],
                            },
                        ],
                    });

                expect(res.statusCode).toEqual(200);

                const response = res.body as components["schemas"]["Recipe"];

                const responseIngredientItem =
                    response.ingredients![0]!.items![0]!;

                expect(responseIngredientItem.recipe!.recipeId).toStrictEqual(
                    subRecipeB!.recipeId,
                );

                const {
                    recipes: [otherRecipePostRequest],
                } = await recipeRepository.read({
                    userId,
                    recipes: [otherRecipe!],
                });

                expect(otherRecipe).toStrictEqual(otherRecipePostRequest);
            },
        );
    });

    withCxIt("should not affect other recipe ratings", async () => {
        const [token, { userId }] =
            await PrepareAuthenticatedUser(userRepository);
        const [_, otherUser] = await PrepareAuthenticatedUser(userRepository);

        const {
            recipes: [recipe, otherRecipe],
        } = await recipeRepository.create({
            userId,
            recipes: [
                { name: uuid(), rating: randomNumber() },
                { name: uuid(), rating: randomNumber() },
            ],
        });

        const otherRating = randomNumber();

        await recipeRepository.saveRating({
            userId: otherUser.userId,
            ratings: [{ ...recipe!, rating: otherRating }],
        });

        const newRating = randomNumber();

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({ rating: newRating });

        expect(res.statusCode).toEqual(200);

        const response = res.body as components["schemas"]["Recipe"];

        // User's rating on recipe was updated
        expect(response.rating!.personal).toEqual(newRating);

        const {
            recipes: [otherRecipeRes],
        } = await recipeRepository.read({
            userId,
            recipes: [otherRecipe!],
        });

        // User's rating on other recipe was not affected
        expect(otherRecipeRes!.rating.personal).toEqual(
            otherRecipe!.rating.personal,
        );

        const {
            recipes: [otherUserRecipeRes],
        } = await recipeRepository.read({
            userId: otherUser.userId,
            recipes: [recipe!],
        });

        // Other user's rating on recipe not affected
        expect(otherUserRecipeRes!.rating.personal).toEqual(otherRating);
    });

    withCxIt("should not affect other recipe tags", async () => {
        const [token, { userId }] =
            await PrepareAuthenticatedUser(userRepository);

        const [tagA, tagB] = await tagRepository.create([
            { name: "tagA" },
            { name: "tagB" },
        ]);

        const {
            recipes: [recipe, otherRecipe],
        } = await recipeRepository.create({
            userId,
            recipes: [
                { name: uuid(), tags: [{ tagId: tagA!.tagId }] },
                {
                    name: uuid(),
                    tags: [{ tagId: tagA!.tagId }, { tagId: tagB!.tagId }],
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({ tags: [{ tagId: tagB!.tagId }] });

        expect(res.statusCode).toEqual(200);

        const response = res.body as components["schemas"]["Recipe"];

        // Tag on recipe was updated
        expect(Object.keys(response.tags!)).toEqual([tagB!.tagId]);

        const {
            recipes: [otherRecipeRes],
        } = await recipeRepository.read({
            userId,
            recipes: [otherRecipe!],
        });

        // Tags on other recipe were not affected
        expect(Object.keys(otherRecipeRes!.tags!).sort()).toEqual(
            [tagA!.tagId, tagB!.tagId].sort(),
        );
    });

    withCxIt("should not affect other recipe photo", async () => {
        const [token, { userId }] =
            await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachmentA, attachmentB],
        } = await attachmentRepository.create({
            userId,
            attachments: [{ uri: uuid() }, { uri: uuid() }],
        });

        const {
            recipes: [recipe, otherRecipe],
        } = await recipeRepository.create({
            userId,
            recipes: [
                {
                    name: uuid(),
                    photo: { attachmentId: attachmentA!.attachmentId },
                },
                {
                    name: uuid(),
                    photo: { attachmentId: attachmentA!.attachmentId },
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({ photo: { attachmentId: attachmentB!.attachmentId } });

        expect(res.statusCode).toEqual(200);

        const response = res.body as components["schemas"]["Recipe"];

        // Photo on recipe was updated
        expect(response.photo!.attachmentId).toEqual(attachmentB!.attachmentId);
        expect(response.photo!.uri).toEqual(attachmentB!.uri);

        const {
            recipes: [otherRecipeRes],
        } = await recipeRepository.read({
            userId,
            recipes: [otherRecipe!],
        });

        // Photo on other recipe was not affected
        expect(otherRecipeRes!.photo!.attachmentId).toEqual(
            attachmentA!.attachmentId,
        );
        expect(otherRecipeRes!.photo!.uri).toEqual(attachmentA!.uri);
    });
});

describe("Get a recipe", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get(`/v1/recipes/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent recipe", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);

        const res = await request(app)
            .delete(`/v1/recipes/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should return correct recipe details", async () => {
        const [token, { userId, firstName }] =
            await PrepareAuthenticatedUser(userRepository);
        const [_, otherUser] = await PrepareAuthenticatedUser(userRepository);

        const {
            attachments: [attachment],
        } = await attachmentRepository.create({
            userId,
            attachments: [{ uri: uuid() }],
        });

        const [tag] = await tagRepository.create([{ name: uuid() }]);

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId,
            recipes: [
                {
                    name: uuid(),
                    public: randomBoolean(),
                    prepTime: randomNumber(),
                    cookTime: randomNumber(),
                    servings: generateRandomRecipeServings(),
                    summary: uuid(),
                    source: uuid(),
                    tips: uuid(),
                    method: generateRandomRecipeMethodSections(),
                    ingredients: generateRandomRecipeIngredientSections(),
                    timesCooked: randomNumber(),
                    rating: randomNumber(),
                    photo: attachment,
                    tags: [{ tagId: tag!.tagId }],
                },
            ],
        });

        const {
            ratings: [otherRating],
        } = await recipeRepository.saveRating({
            userId: otherUser.userId,
            ratings: [{ recipeId: recipe!.recipeId, rating: randomNumber() }],
        });

        const res = await request(app)
            .get(`/v1/recipes/${recipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const response = res.body as components["schemas"]["Recipe"];

        expect(response.recipeId).toEqual(recipe!.recipeId);
        expect(response!.name).toBe(recipe!.name);
        expect(response!.public).toBe(recipe!.public);
        expect(response!.prepTime).toBe(recipe!.prepTime);
        expect(response!.cookTime).toStrictEqual(recipe!.cookTime);
        expect(response!.servings).toStrictEqual(recipe!.servings);
        expect(response!.summary).toBe(recipe!.summary);
        expect(response!.source).toBe(recipe!.source);
        expect(response!.tips).toBe(recipe!.tips);
        expect(response!.timesCooked).toBe(recipe!.timesCooked);
        expect(response!.method).toStrictEqual(recipe!.method);
        // JSON-serialise to match the wire format (undefined keys are dropped)
        expect(response!.ingredients).toStrictEqual(
            JSON.parse(JSON.stringify(recipe!.ingredients)),
        );
        expect(response!.rating!.personal).toBe(recipe!.rating.personal);
        expect(response!.rating!.average).toEqual(
            (recipe!.rating.personal! + otherRating!.rating!) / 2,
        );
        expect(response!.photo!.attachmentId).toBe(attachment!.attachmentId);
        expect(response!.photo!.uri).toBe(attachment!.uri);
        expect(response!.tags).toStrictEqual({
            [tag!.tagId]: { tagId: tag!.tagId, name: tag!.name },
        });
        expect(response!.owner.userId).toBe(userId);
        expect(response!.owner.firstName).toBe(firstName);
    });
});

describe("Delete a recipe", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).delete(`/v1/recipes/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent recipe", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);

        const res = await request(app)
            .delete(`/v1/recipes/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should delete a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/recipes/${recipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const { recipes } = await recipeRepository.read({
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });
        expect(recipes).toHaveLength(0);
    });

    withCxIt("should delete a recipe with linked ingredients", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            ingredients: [ingredient],
        } = await ingredientRepository.create({
            userId: user.userId,
            ingredients: [{ name: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [
                {
                    name: uuid(),
                    ingredients: [
                        {
                            items: [
                                {
                                    ingredient: {
                                        ingredientId: ingredient!.ingredientId,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/recipes/${recipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const { recipes } = await recipeRepository.read({
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });
        expect(recipes).toHaveLength(0);
    });

    withCxIt("should delete a recipe used as a sub-recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            recipes: [subRecipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [
                {
                    name: uuid(),
                    ingredients: [
                        {
                            items: [
                                { recipe: { recipeId: subRecipe!.recipeId } },
                            ],
                        },
                    ],
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/recipes/${subRecipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const { recipes } = await recipeRepository.read({
            userId: user.userId,
            recipes: [subRecipe!],
        });
        expect(recipes).toHaveLength(0);

        // Parent recipe remains readable without the sub-recipe reference
        const { recipes: parentRecipes } = await recipeRepository.read({
            userId: user.userId,
            recipes: [recipe!],
        });
        expect(parentRecipes).toHaveLength(1);
    });
});

describe("Rate a recipe", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(`/v1/recipes/${uuid()}/rating`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should rate a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            recipes: [recipe],
        } = await recipeRepository.create({
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const rating = randomNumber(5);
        const res = await request(app)
            .post(`/v1/recipes/${recipe!.recipeId}/rating`)
            .set(token)
            .send({ rating });

        expect(res.statusCode).toEqual(200);
        expect(res.body.rating).toEqual(rating);

        const {
            recipes: [updatedRecipe],
        } = await recipeRepository.read({
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });
        expect(updatedRecipe!.rating!.personal).toEqual(rating);
    });
});
