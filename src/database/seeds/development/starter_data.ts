import { Undefined } from "@reillymc/es-utils";
import bcrypt from "bcrypt";
import type { Knex } from "knex";

const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
};

export const seed = async (knex: Knex): Promise<void> => {
    await knex("user")
        .insert([
            {
                userId: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
                email: "alice@lamington.app",
                firstName: "Alice",
                lastName: "Lamington",
                password: await hashPassword("lamington.app"),
                status: "O",
                preferences: "{}",
            },
            {
                userId: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
                email: "bob@lamington.app",
                firstName: "Bob",
                lastName: "Lamington",
                password: await hashPassword("lamington.app"),
                status: "A",
                preferences: "{}",
            },
            {
                userId: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
                email: "cherlie@lamington.app",
                firstName: "Charlie",
                lastName: "Lamington",
                password: await hashPassword("lamington.app"),
                status: "M",
                preferences: "{}",
            },
        ])
        .onConflict("email")
        .merge();

    const books = [
        {
            bookId: "00ba8d00-7360-46dc-ba97-858d5bfee24b",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "Example book",
        },
        {
            bookId: "4b1e6d4d-6095-4201-b803-4f6249f0ef6f",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Lunch Ideas",
        },
        {
            bookId: "5395c629-2251-4af5-90f0-8b0bd2b2ac73",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Test Book with a Rather Long Title",
            description: "A basic cook book!",
        },
        {
            bookId: "58f62e77-3a63-41bf-8d6c-bd26bf1ccb5c",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "My recipe book",
        },
        {
            bookId: "6e9e66ed-d39c-47f1-956b-f455e8f2e166",
            createdBy: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
            name: "Short",
        },
        {
            bookId: "b7a49a84-f39a-44b0-a8db-fc3d12a23a38",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Favourite Recipes",
            description: "My top recipes to cook",
        },
        {
            bookId: "ddcb92f8-9a00-48d1-839d-b1080c9d0263",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Healthy Dinners",
        },
        {
            bookId: "f7d6f62e-7d1e-4b1a-a5a9-b24ed0fb4425",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "Fun",
        },
    ];

    await knex("content")
        .insert(
            books.map(({ bookId, createdBy }) => ({
                contentId: bookId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();
    await knex("book")
        .insert(
            books.map(({ bookId, name, description }) => ({
                bookId,
                name,
                description,
            })),
        )
        .onConflict("bookId")
        .merge();

    const recipes = [
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            name: "Gnocchi with Tomato Cream Sauce",
            servings: {
                unit: "people",
                count: { representation: "number", value: "4" },
            },
            prepTime: 20,
            cookTime: 30,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            createdAt: "2023-05-10 00:00:00",
            updatedAt: "2023-06-25 00:00:00",
            public: false,
            timesCooked: 0,
            ingredients: [
                {
                    items: [
                        {
                            ingredient: {
                                ingredientId:
                                    "9ef451e3-aea2-45ca-9802-a218f91dc8ee",
                            },
                            unit: "tbsp",
                            amount: { representation: "number", value: "2" },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "e069e0bd-4f49-4180-bc5e-c6715a4dbc24",
                            },
                            unit: "g",
                            amount: { representation: "number", value: "500" },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "fd0832c0-7610-431b-b440-f75b8016005c",
                            },
                            unit: "tbsp",
                            amount: { representation: "number", value: "2" },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "c4e53ec8-1a15-4b07-9d59-fb3593138b2a",
                            },
                            unit: "cup",
                            amount: {
                                representation: "fraction",
                                value: ["", "1", "2"],
                            },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "ebd0aad1-34f2-4540-8526-ef33b68ba292",
                            },
                            unit: "cup",
                            amount: {
                                representation: "fraction",
                                value: ["", "1", "3"],
                            },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "699016d0-549c-4f8e-a593-bf9fbc98082f",
                            },
                            unit: "g",
                            preparation: "diced",
                            amount: { representation: "number", value: "400" },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "13945396-ca26-40c6-8858-886edd9438eb",
                            },
                            unit: "tsp",
                            amount: { representation: "number", value: "3" },
                        },
                        {
                            ingredient: {
                                ingredientId:
                                    "4731ab8e-77d2-4f88-9da8-48b6be04e720",
                            },
                            unit: "tsp",
                            amount: { representation: "number", value: "3" },
                        },
                    ],
                },
            ],
            method: [
                {
                    name: "Cooking the Gnocchi",
                    items: [
                        {
                            content:
                                "Fill a pot with about 3 inches of water and bring to a boil.",
                        },
                        {
                            content:
                                "Boil gnocchi for 2-3 minutes until it floats. Drain, then toss with 3 teaspoons olive oil.",
                        },
                        {
                            content:
                                "Melt butter in a large skillet. Add garlic and sauté until fragrant.",
                        },
                        {
                            content:
                                "Add gnocchi. Sauté 2-4 minutes until it begins to brown.",
                        },
                        {
                            content: "Transfer gnocchi to a bowl and cover.",
                        },
                    ],
                },
                {
                    name: "Cooking the Sauce",
                    items: [
                        {
                            content:
                                "Add tomatoes and tomato sauce to the skillet and bring to a simmer.",
                        },
                        {
                            content:
                                "Stir in heavy cream and salt and pepper. Simmer for 4 to 5 minutes until sauce is reduced and creamy.",
                        },
                        {
                            content:
                                "Stir in the gnocchi. Garnish with basil and freshly grated parmesan cheese.",
                        },
                    ],
                },
            ],
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            name: "Black Bean Enchiladas",
            servings: {
                unit: "people",
                count: { representation: "number", value: "3" },
            },
            prepTime: 20,
            cookTime: 40,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            createdAt: "2023-05-10 00:00:00",
            updatedAt: "2023-06-25 00:00:00",
            public: false,
            timesCooked: 0,
            ingredients: null,
            method: null,
        },
    ] as const;

    await knex("content")
        .insert(
            recipes.map(({ recipeId, createdBy }) => ({
                contentId: recipeId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();

    await knex("recipe")
        .insert(
            recipes.map(
                ({
                    recipeId,
                    name,
                    servings,
                    prepTime,
                    cookTime,
                    public: isPublic,
                    timesCooked,
                    ingredients,
                    method,
                }) => ({
                    recipeId,
                    name,
                    servings,
                    prepTime,
                    cookTime,
                    public: isPublic,
                    timesCooked,
                    ingredients: JSON.stringify(ingredients),
                    method: JSON.stringify(method),
                }),
            ),
        )
        .onConflict("recipeId")
        .merge();

    await knex("recipe_ingredient")
        .insert(
            recipes
                .flatMap(({ recipeId, ingredients }) =>
                    ingredients?.flatMap(({ items }) =>
                        items.map(({ ingredient: { ingredientId } }) => ({
                            recipeId,
                            ingredientId,
                        })),
                    ),
                )
                .filter(Undefined),
        )
        .onConflict(["recipeId", "ingredientId"])
        .merge();

    await knex("book_recipe")
        .insert([
            {
                bookId: "b7a49a84-f39a-44b0-a8db-fc3d12a23a38",
                recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            },
        ])
        .onConflict(["bookId", "recipeId"])
        .merge();

    await knex("recipe_rating")
        .insert([
            {
                recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
                raterId: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
                rating: 4,
            },
            {
                recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
                raterId: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
                rating: 4,
            },
        ])
        .onConflict(["recipeId", "raterId"])
        .merge();

    await knex("content_tag")
        .insert([
            {
                contentId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
                tagId: "46839022-4057-4722-b2c0-0f376b5ad2f9",
            },
            {
                contentId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
                tagId: "61ee0516-1987-4b6b-a59a-251cc07b2995",
            },
            {
                contentId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
                tagId: "20b77d21-acba-48af-8876-0a590e940e41",
            },
            {
                contentId: "99656745-3325-4a47-9361-caba8849a4e2",
                tagId: "06158727-fc25-4d99-b356-7a36a07a8993",
            },
            {
                contentId: "99656745-3325-4a47-9361-caba8849a4e2",
                tagId: "61ee0516-1987-4b6b-a59a-251cc07b2995",
            },
            {
                contentId: "99656745-3325-4a47-9361-caba8849a4e2",
                tagId: "c5db7042-4aae-49fd-ae09-0e7514a2a369",
            },
        ])
        .onConflict(["contentId", "tagId"])
        .merge();

    const lists = [
        {
            listId: "3f94889b-3125-4052-9dc1-7f41bb15971e",
            name: "Fruit and Vegetable Market",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            description: "Fresh produce",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            name: "My Shopping List",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            description: "A list of all the items I need to buy",
        },
    ];

    await knex("content")
        .insert(
            lists.map(({ listId, createdBy }) => ({
                contentId: listId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();

    await knex("list")
        .insert(
            lists.map(({ listId, name, description }) => ({
                listId,
                name,
                description,
            })),
        )
        .onConflict("listId")
        .merge();

    const listItems = [
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "01177fd7-89d9-44b6-a9f2-e79949451d04",
            name: "Onions",
            updatedAt: "2023-05-21 06:46:38",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "0400a0ec-c7aa-4a4a-bd38-81a4db0fed87",
            name: "Garlic",
            updatedAt: "2023-05-21 06:46:31",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "144ac6a8-38a4-4308-9cba-3f8e504bf38c",
            name: "Butter",
            ingredientId: "fd0832c0-7610-431b-b440-f75b8016005c",
            updatedAt: "2023-05-21 06:48:38",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "3f94889b-3125-4052-9dc1-7f41bb15971e",
            itemId: "65ec0dce-d4c7-4147-b1c4-d17a591b7994",
            name: "Spinach",
            updatedAt: "2023-05-21 06:51:16",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "76be7e77-afee-4e1d-866a-61e68ee09354",
            name: "Banana[|s]",
            unit: "bunch",
            amount: { representation: "number", value: "2" } as const,
            updatedAt: "2023-05-21 06:48:14",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "3f94889b-3125-4052-9dc1-7f41bb15971e",
            itemId: "a80b8f6f-e755-4c91-9050-68e081bf2ef7",
            name: "Apples",
            updatedAt: "2023-05-21 06:51:23",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "bdf37677-b8ca-4f38-9ff0-3a1f557d371c",
            name: "Egg[|s]",
            ingredientId: "13945396-ca26-40c6-8858-886edd9438eb",
            updatedAt: "2023-05-21 06:46:16",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "cbaaaa0a-fcd8-42fe-8ac4-1cf995f90098",
            name: "Flour",
            unit: "g",
            amount: { representation: "number", value: "500" } as const,
            updatedAt: "2023-05-21 06:46:21",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
    ];

    await knex("content")
        .insert(
            listItems.map(({ itemId, createdBy }) => ({
                contentId: itemId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();

    await knex("list_item")
        .insert(
            listItems.map(
                ({
                    listId,
                    itemId,
                    name,
                    ingredientId,
                    unit,
                    amount,
                    completed,
                }) => ({
                    listId,
                    itemId,
                    name,
                    ingredientId: ingredientId,
                    unit: unit,
                    amount: amount,
                    completed,
                }),
            ),
        )
        .onConflict("itemId")
        .merge();

    const planners = [
        {
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "My Meal Planner",
            description: "A planner for all the meals I want to cook",
        },
    ];

    await knex("content")
        .insert(
            planners.map(({ plannerId, createdBy }) => ({
                contentId: plannerId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();

    await knex("planner")
        .insert(
            planners.map(({ plannerId, name, description }) => ({
                plannerId,
                name,
                description,
            })),
        )
        .onConflict("plannerId")
        .merge();

    const plannerMeals = [
        {
            mealId: "02609a6a-4d94-44a2-9972-42723a089ceb",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            meal: "lunch",
            description: "Lunch with Bob",
        },
        {
            mealId: "09ada2e6-ac60-4c6e-bfd2-f3809d446823",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 20,
            meal: "lunch",
            description: "Salad",
        },
        {
            mealId: "34f7b97e-8117-495a-ba60-758a7e176df7",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 26,
            meal: "breakfast",
            description: "Overnight Oats",
        },
        {
            mealId: "6d83889e-9d50-47b6-b847-19faaeaa6d45",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 26,
            meal: "dinner",
            description: "Pizza",
        },
        {
            mealId: "73f98131-06c8-4b43-95cf-ed0c3ec2f3a1",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 27,
            meal: "lunch",
            description: "Family Lunch",
        },
        {
            mealId: "92c7818f-5a27-48b4-b51c-1332d56337b9",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            meal: "breakfast",
            description: "Scrambled Eggs",
        },
        {
            mealId: "aab75e80-957a-4c6c-86c7-dd3d514b979b",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 23,
            meal: "dinner",
            description: "Black Bean Enchiladas",
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
        },
        {
            mealId: "ad7d8c9a-2809-4fab-a52c-695ebb54f80f",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 24,
            meal: "breakfast",
            description: "Muesli",
        },
        {
            mealId: "bb2c76dd-926c-474c-be2e-c64b4f86d6d3",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            meal: "breakfast",
            description: "Example meal with no recipe",
            source: "www.google.com",
        },
        {
            mealId: "d1749d9e-1a6e-42f7-9292-bb9a1533d6ab",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Risotto-Stuffed Tomatoes",
            year: 2024,
            month: 4,
            dayOfMonth: 25,
        },
        {
            mealId: "eec01654-1a29-48de-bdac-70b0267f9087",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Black Bean Enchiladas",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
        },
        {
            mealId: "f4795472-90cc-493b-af99-523a23bcff3c",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Risotto-Stuffed Tomatoes",
            year: 2024,
            month: 4,
            dayOfMonth: 24,
        },
        {
            mealId: "f65ebeef-a0bc-4d27-b865-caf3c6fb8023",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "breakfast",
            description: "Overnight Oats",
            year: 2024,
            month: 4,
            dayOfMonth: 21,
        },
        {
            mealId: "e7aaf2b9-631b-4b07-b624-ccd0b479ed7b",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "breakfast",
            description: "Fruit Smoothie",
            year: 2024,
            month: 4,
            dayOfMonth: 23,
        },
    ];

    await knex("content")
        .insert(
            plannerMeals.map(({ mealId, createdBy }) => ({
                contentId: mealId,
                createdBy,
            })),
        )
        .onConflict("contentId")
        .merge();

    await knex("planner_meal")
        .insert(
            plannerMeals.map(
                ({
                    mealId,
                    plannerId,
                    year,
                    month,
                    dayOfMonth,
                    meal,
                    description,
                    recipeId,
                    source,
                }) => ({
                    mealId,
                    plannerId,
                    year,
                    month,
                    dayOfMonth,
                    meal,
                    description,
                    recipeId: recipeId,
                    source: source,
                }),
            ),
        )
        .onConflict("mealId")
        .merge();
};
