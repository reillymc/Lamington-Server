import { Knex } from "knex";
import {
    Book,
    BookRecipe,
    Ingredient,
    List,
    ListItem,
    Meal,
    Planner,
    Recipe,
    RecipeIngredient,
    RecipeRating,
    RecipeSection,
    RecipeStep,
    RecipeTag,
    Tag,
    User,
    lamington,
} from "../../definitions";

export const seed = async (knex: Knex): Promise<void> => {
    // Delete ALL existing entries
    await knex(lamington.bookMember).del();
    await knex(lamington.listMember).del();
    await knex(lamington.plannerMember).del();
    await knex(lamington.listItem).del();
    await knex(lamington.recipeTag).del();
    await knex(lamington.bookRecipe).del();
    await knex(lamington.plannerMeal).del();
    await knex(lamington.recipeRating).del();
    await knex(lamington.recipeIngredient).del();
    await knex(lamington.recipeStep).del();
    await knex(lamington.recipeSection).del();
    await knex(lamington.recipeNote).del();
    await knex(lamington.tag).del();
    await knex(lamington.book).del();
    await knex(lamington.ingredient).del();
    await knex(lamington.list).del();
    await knex(lamington.planner).del();
    await knex(lamington.recipe).del();
    await knex(lamington.user).del();

    // Inserts seed entries
    await knex<User>(lamington.user).insert([
        {
            userId: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            email: "test@test.com",
            firstName: "Alice",
            lastName: "Lamington",
            password: "",
            status: "R",
            preferences: "{}",
        },
        {
            userId: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            email: "example@example.com",
            firstName: "Tim",
            lastName: "Lamington",
            password: "",
            status: "R",
            preferences: "{}",
        },
        {
            userId: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
            email: "sample@sample.com",
            firstName: "Brian",
            lastName: "Lamington",
            password: "",
            status: "A",
            preferences: "{}",
        },
    ]);

    await knex<Tag>(lamington.tag).insert([
        {
            tagId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            name: "Dietary",
            description: "Dietary requirements recipe caters to",
        },
        {
            tagId: "d58e5bf0-2fe7-4356-a9fa-17a6feec5764",
            name: "Vegetarian",
            parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
        },
        {
            tagId: "570ac8b5-82f0-4fab-8b29-2c8b48c9e78b",
            name: "Vegan",
            parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
        },
        {
            tagId: "d8f703fe-b0b5-43f4-ae15-7ecce6bf03c5",
            name: "Gluten free",
            parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
        },
        {
            tagId: "0656cd4b-ebdf-4217-b113-3590b3df1077",
            name: "Dairy free",
            parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
        },
        {
            tagId: "5508c6d9-49c7-462e-9e45-f6e6c78abe6c",
            name: "Difficulty",
            description: "Skill / time / effort required to cook recipe",
        },
        {
            tagId: "28b6995b-811f-44bb-af9f-768d078e010e",
            name: "Hard",
            parentId: "5508c6d9-49c7-462e-9e45-f6e6c78abe6c",
        },
        {
            tagId: "95a5cc8c-3f69-4652-9810-6597002899bd",
            name: "Easy",
            parentId: "5508c6d9-49c7-462e-9e45-f6e6c78abe6c",
        },
        {
            tagId: "ff629e93-cc6a-4dbf-bc5e-6969f89eed47",
            name: "Medium",
            parentId: "5508c6d9-49c7-462e-9e45-f6e6c78abe6c",
        },
        {
            tagId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
            name: "Meal",
            description: "Meal / course recipe is designed for",
        },
        {
            tagId: "61ee0516-1987-4b6b-a59a-251cc07b2995",
            name: "Dinner",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "13aaec7b-70bd-4f9b-ac77-ffcea1e081cb",
            name: "Lunch",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "229e59f5-fb5d-462b-84b5-3c8184cb603b",
            name: "Snack",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "24a49560-c7be-42b2-a3c3-a7d4b7ef9b24",
            name: "Breakfast",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "4a021129-6fe1-48a9-ae53-014a16a8fe74",
            name: "Dessert",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "2f6fb407-9914-4636-9ed4-2fe7259130f6",
            name: "Preparation",
            description: "A sub-recipe / component used in other recipes",
            parentId: "7a2dc44b-1eac-4810-8a1c-322cb14ce5c8",
        },
        {
            tagId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            name: "Cusine",
            description: "Recipe styles",
        },
        {
            tagId: "c5db7042-4aae-49fd-ae09-0e7514a2a369",
            name: "Mexican",
            parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
        },
        {
            tagId: "3013ae97-596b-463b-ad68-99e4ea7d9617",
            name: "Indian",
            parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
        },
        {
            tagId: "20b77d21-acba-48af-8876-0a590e940e41",
            name: "Italian",
            parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
        },
        {
            tagId: "e6167e53-7115-475d-ade0-6261e486f4ce",
            name: "Cost",
            description: "Price range to cook based on ingredients",
        },
        {
            tagId: "06158727-fc25-4d99-b356-7a36a07a8993",
            name: "$",
            description: "Budget",
            parentId: "e6167e53-7115-475d-ade0-6261e486f4ce",
        },
        {
            tagId: "46839022-4057-4722-b2c0-0f376b5ad2f9",
            name: "$$",
            description: "Mid-range",
            parentId: "e6167e53-7115-475d-ade0-6261e486f4ce",
        },
        {
            tagId: "c403667a-343f-4af0-9bbe-d8350afdb474",
            name: "$$$",
            description: "Expensive",
            parentId: "e6167e53-7115-475d-ade0-6261e486f4ce",
        },
    ]);

    await knex<Book>(lamington.book).insert([
        {
            bookId: "00ba8d00-7360-46dc-ba97-858d5bfee24b",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "Example book",
            customisations: "{}",
        },
        {
            bookId: "4b1e6d4d-6095-4201-b803-4f6249f0ef6f",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Lunch Ideas",
            customisations: "{}",
        },
        {
            bookId: "5395c629-2251-4af5-90f0-8b0bd2b2ac73",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Test Book with a Rather Long Title",
            customisations: "{}",
            description: "A basic cook book!",
        },
        {
            bookId: "58f62e77-3a63-41bf-8d6c-bd26bf1ccb5c",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "My recipe book",
            customisations: "{}",
        },
        {
            bookId: "6e9e66ed-d39c-47f1-956b-f455e8f2e166",
            createdBy: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
            name: "Short",
            customisations: "{}",
        },
        {
            bookId: "b7a49a84-f39a-44b0-a8db-fc3d12a23a38",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Favourite Recipes",
            customisations: "{}",
            description: "My top recipes to cook",
        },
        {
            bookId: "ddcb92f8-9a00-48d1-839d-b1080c9d0263",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "Healthy Dinners",
            customisations: "{}",
        },
        {
            bookId: "f7d6f62e-7d1e-4b1a-a5a9-b24ed0fb4425",
            createdBy: "3812f892-31d7-4ac8-bca0-5f5819b100cc",
            name: "Fun",
            customisations: "{}",
        },
    ]);

    await knex<Ingredient>(lamington.ingredient).insert([
        {
            ingredientId: "0ba54249-1f93-4c56-b788-05b91e81a3e5",
            name: "Capsicum",
            createdBy: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
        },
        {
            ingredientId: "13c4a101-4af6-4d28-af11-c7b8c173939c",
            name: "Heavy cream",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "21e5659d-0401-4d06-8764-c1c67185890c",
            name: "Diced tomatoes",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "425adfcd-d25a-43e5-8d4d-03b013d1257e",
            name: "Garlic",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "4dc32711-a2b8-4f8d-8628-8c34f6d601f5",
            name: "Butter",
            createdBy: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
        },
        {
            ingredientId: "5fe947e0-3057-4fe3-b3e4-92aa5ee636fd",
            name: "Passata",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "708e6170-ebed-4ae7-8a09-56819b215a6b",
            name: "Egg[|s]",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "893496e9-4d6d-42cb-9518-a99623974038",
            name: "Potato Gnocchi",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "977c7c24-0bc7-4537-a307-5cae4e50ab15",
            name: "Olive oil",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "a65207f9-34d7-4061-95d9-a0a2337720fc",
            name: "Bay lea[f|ves]",
            createdBy: "4df86d9d-e2a4-4ca3-b895-6f325451b33c",
        },
        {
            ingredientId: "bfe3893a-10aa-4428-bf2d-b98097a498ef",
            name: "Spinach",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            ingredientId: "f3dda7b8-9690-4361-bcb7-7d27f20c8c8d",
            name: "Salt",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
    ]);

    await knex<Recipe>(lamington.recipe).insert([
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            name: "Gnocchi with Tomato Cream Sauce",
            photo: "lamington:dev/839c1893-e03b-4479-85f2-138e4d42a2e8/recipe/02eab0b9-d8f2-4d64-bc76-cbac36e4c59f_0.jpg",
            servings: JSON.stringify({ unit: "people", count: { representation: "number", value: "4" } }),
            prepTime: 20,
            cookTime: 30,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            createdAt: "2023-05-10 00:00:00",
            updatedAt: "2023-06-25 00:00:00",
            public: false,
            timesCooked: 0,
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            name: "Black Bean Enchiladas",
            photo: "lamington:dev/839c1893-e03b-4479-85f2-138e4d42a2e8/recipe/99656745-3325-4a47-9361-caba8849a4e2_0.jpg",
            servings: JSON.stringify({ unit: "people", count: { representation: "number", value: "3" } }),
            prepTime: 20,
            cookTime: 40,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            createdAt: "2023-05-10 00:00:00",
            updatedAt: "2023-06-25 00:00:00",
            public: false,
            timesCooked: 0,
        },
    ]);

    await knex<BookRecipe>(lamington.bookRecipe).insert([
        {
            bookId: "b7a49a84-f39a-44b0-a8db-fc3d12a23a38",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
        },
    ]);

    await knex<RecipeRating>(lamington.recipeRating).insert([
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
    ]);

    await knex<RecipeTag>(lamington.recipeTag).insert([
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            tagId: "46839022-4057-4722-b2c0-0f376b5ad2f9",
        },
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            tagId: "61ee0516-1987-4b6b-a59a-251cc07b2995",
        },
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            tagId: "20b77d21-acba-48af-8876-0a590e940e41",
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            tagId: "06158727-fc25-4d99-b356-7a36a07a8993",
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            tagId: "61ee0516-1987-4b6b-a59a-251cc07b2995",
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            tagId: "c5db7042-4aae-49fd-ae09-0e7514a2a369",
        },
    ]);

    await knex<RecipeSection>(lamington.recipeSection).insert([
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 0,
            name: "default",
        },
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 1,
            name: "Cooking the Gnocchi",
        },
        {
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "6859b86b-def1-4779-a794-ac33cb9d180f",
            index: 2,
            name: "Cooking the Sauce",
        },
        {
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
            sectionId: "afb7090d-17d3-40b7-9c6e-f89388b23235",
            index: 0,
            name: "default",
        },
    ]);

    await knex<RecipeIngredient>(lamington.recipeIngredient).insert([
        {
            id: "15fed8ab-3554-4a81-ad80-82f36eb3267e",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "a65207f9-34d7-4061-95d9-a0a2337720fc",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 7,
            unit: "tbsp",
            amount: JSON.stringify({ representation: "number", value: "2" }),
        },
        {
            id: "18025e5b-cea2-493a-8794-6bf8645cf6e3",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "893496e9-4d6d-42cb-9518-a99623974038",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 0,
            unit: "g",
            amount: JSON.stringify({ representation: "number", value: "500" }),
        },
        {
            id: "95de556a-57fd-4758-974e-73158288499c",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "4dc32711-a2b8-4f8d-8628-8c34f6d601f5",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 1,
            unit: "tbsp",
            amount: JSON.stringify({ representation: "number", value: "2" }),
        },
        {
            id: "9b9e6ced-8917-46b1-a995-8d25601f7f10",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "5fe947e0-3057-4fe3-b3e4-92aa5ee636fd",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 5,
            unit: "cup",
            amount: JSON.stringify({ representation: "fraction", value: ["", "1", "2"] }),
        },
        {
            id: "a82aaf64-522f-4a20-9eff-2d3306c29b56",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "13c4a101-4af6-4d28-af11-c7b8c173939c",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 6,
            unit: "cup",
            amount: JSON.stringify({ representation: "fraction", value: ["", "1", "3"] }),
        },
        {
            id: "c7910620-fe7f-4d32-825f-73b7f3e42900",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "21e5659d-0401-4d06-8764-c1c67185890c",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 4,
            unit: "g",
            amount: JSON.stringify({ representation: "number", value: "400" }),
        },
        {
            id: "f1692298-cb69-431c-baf2-99cb79090150",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "708e6170-ebed-4ae7-8a09-56819b215a6b",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 3,
            unit: "tsp",
            amount: JSON.stringify({ representation: "number", value: "3" }),
        },
        {
            id: "fe32282e-fa85-428a-b819-4f0ac6ffbb92",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            ingredientId: "425adfcd-d25a-43e5-8d4d-03b013d1257e",
            sectionId: "444b8e22-ed15-425f-accc-ba7a52082a30",
            index: 2,
            unit: "tsp",
            amount: JSON.stringify({ representation: "number", value: "3" }),
        },
    ]);

    await knex<RecipeStep>(lamington.recipeStep).insert([
        {
            id: "04e951b8-23c0-49f6-9d90-f7c8fff1511f",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "6859b86b-def1-4779-a794-ac33cb9d180f",
            index: 2,
            description: "Stir in the gnocchi. Garnish with basil and freshly grated parmesan cheese.",
        },
        {
            id: "2200de77-1d51-472f-b415-ebebbfdf2030",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 3,
            description: "Add gnocchi. Sauté 2-4 minutes until it begins to brown.",
        },
        {
            id: "2892b0fb-80d7-46d1-a0fa-3b700ce9911c",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 4,
            description: "Transfer gnocchi to a bowl and cover.",
        },
        {
            id: "43c93099-554f-415d-ae8c-fe0a1bf8a50a",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "6859b86b-def1-4779-a794-ac33cb9d180f",
            index: 0,
            description: "Add tomatoes and tomato sauce to the skillet and bring to a simmer.",
        },
        {
            id: "7f468385-0081-4f5b-8a88-d0a4fc572f55",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "6859b86b-def1-4779-a794-ac33cb9d180f",
            index: 1,
            description:
                "Stir in heavy cream and salt and pepper. Simmer for 4 to 5 minutes until sauce is reduced and creamy.",
        },
        {
            id: "91cd24fe-b65b-4fef-8b86-bcb51700d143",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 1,
            description: "Boil gnocchi for 2-3 minutes until it floats. Drain, then toss with 3 teaspoons olive oil.",
        },
        {
            id: "ee8c1fdc-0af6-462f-afbb-5c8e87883fd3",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 2,
            description: "Melt butter in a large skillet. Add garlic and sauté until fragrant.",
        },
        {
            id: "fd34ae8c-f83b-42b2-8894-cf4aefb6f802",
            recipeId: "02eab0b9-d8f2-4d64-bc76-cbac36e4c59f",
            sectionId: "50030d2b-2a01-4fbe-b725-2947831f35ac",
            index: 0,
            description: "Fill a pot with about 3 inches of water and bring to a boil.",
        },
    ]);

    await knex<List>(lamington.list).insert([
        {
            listId: "3f94889b-3125-4052-9dc1-7f41bb15971e",
            name: "Fruit and Vegetable Market",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            customisations: "{}",
            description: "Fresh produce",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            name: "My Shopping List",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            customisations: "{}",
            description: "A list of all the items I need to buy",
        },
    ]);

    await knex<ListItem>(lamington.listItem).insert([
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
            ingredientId: "4dc32711-a2b8-4f8d-8628-8c34f6d601f5",
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
            amount: JSON.stringify({ representation: "number", value: "2" }),
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
            ingredientId: "708e6170-ebed-4ae7-8a09-56819b215a6b",
            updatedAt: "2023-05-21 06:46:16",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
        {
            listId: "517959f9-02d8-42a3-9dc9-5934f68561d0",
            itemId: "cbaaaa0a-fcd8-42fe-8ac4-1cf995f90098",
            name: "Flour",
            unit: "g",
            amount: JSON.stringify({ representation: "number", value: "500" }),
            updatedAt: "2023-05-21 06:46:21",
            completed: false,
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
        },
    ]);

    await knex<Planner>(lamington.planner).insert([
        {
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            name: "My Meal Planner",
            customisations: "{}",
            description: "A planner for all the meals I want to cook",
        },
    ]);

    await knex<Meal>(lamington.plannerMeal).insert([
        {
            id: "02609a6a-4d94-44a2-9972-42723a089ceb",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            meal: "lunch",
            description: "Lunch with Bob",
        },
        {
            id: "09ada2e6-ac60-4c6e-bfd2-f3809d446823",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 20,
            meal: "lunch",
            description: "Salad",
        },
        {
            id: "34f7b97e-8117-495a-ba60-758a7e176df7",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 26,
            meal: "breakfast",
            description: "Overnight Oats",
        },
        {
            id: "6d83889e-9d50-47b6-b847-19faaeaa6d45",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 26,
            meal: "dinner",
            description: "Pizza",
        },
        {
            id: "73f98131-06c8-4b43-95cf-ed0c3ec2f3a1",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 27,
            meal: "lunch",
            description: "Family Lunch",
        },
        {
            id: "92c7818f-5a27-48b4-b51c-1332d56337b9",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            meal: "breakfast",
            description: "Scrambled Eggs",
        },
        {
            id: "aab75e80-957a-4c6c-86c7-dd3d514b979b",
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
            id: "ad7d8c9a-2809-4fab-a52c-695ebb54f80f",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            year: 2024,
            month: 4,
            dayOfMonth: 24,
            meal: "breakfast",
            description: "Muesli",
        },
        {
            id: "bb2c76dd-926c-474c-be2e-c64b4f86d6d3",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            createdBy: "2a596f2e-d604-4a99-af8f-ffb370ca6286",
            meal: "breakfast",
            description: "Example meal with no recipe",
            source: "www.google.com",
        },
        {
            id: "d1749d9e-1a6e-42f7-9292-bb9a1533d6ab",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Risotto-Stuffed Tomatoes",
            year: 2024,
            month: 4,
            dayOfMonth: 25,
        },
        {
            id: "eec01654-1a29-48de-bdac-70b0267f9087",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Black Bean Enchiladas",
            year: 2024,
            month: 4,
            dayOfMonth: 22,
            recipeId: "99656745-3325-4a47-9361-caba8849a4e2",
        },
        {
            id: "f4795472-90cc-493b-af99-523a23bcff3c",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "dinner",
            description: "Risotto-Stuffed Tomatoes",
            year: 2024,
            month: 4,
            dayOfMonth: 24,
        },
        {
            id: "f65ebeef-a0bc-4d27-b865-caf3c6fb8023",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "breakfast",
            description: "Overnight Oats",
            year: 2024,
            month: 4,
            dayOfMonth: 21,
        },
        {
            id: "e7aaf2b9-631b-4b07-b624-ccd0b479ed7b",
            plannerId: "eabedc0b-8b45-4432-9ddd-4b9855cb06ce",
            meal: "breakfast",
            description: "Fruit Smoothie",
            year: 2024,
            month: 4,
            dayOfMonth: 23,
        },
    ]);
};
