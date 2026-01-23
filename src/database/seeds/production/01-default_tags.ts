import type { Knex } from "knex";
import { lamington, type Tag } from "../../definitions/index.ts";

// Default tags
export const seed = async (knex: Knex): Promise<void> => {
    await knex<Tag>(lamington.tag)
        .insert([
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
                name: "Gluten-free",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "0656cd4b-ebdf-4217-b113-3590b3df1077",
                name: "Dairy-free",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "d8661f0c-4a44-4ac3-a70b-fd8697e18478",
                name: "Egg-free",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "a5c24644-1a0f-4af2-977f-c006aadb8b90",
                name: "Nut-free",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "88602d73-d03d-44bb-8a69-fbfcc7963d17",
                name: "Healthy",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "d19e9d74-f6f5-44e9-9cb2-9d14223b9531",
                name: "Low-calorie",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "d2697ffb-2f44-4b74-930b-6f09184ea3a5",
                name: "Low-fat",
                parentId: "038e3305-b679-4822-bc57-6e6fda8eb766",
            },
            {
                tagId: "9a783ff7-2286-4655-aa70-8e1dac5e88ec",
                name: "Low-sugar",
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
                tagId: "e4bf71d6-826f-4799-aad7-38de2b5750af",
                name: "Entrée",
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
                name: "Cuisine",
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
                tagId: "afe6a080-2125-41d9-9ef9-aa8c0f785806",
                name: "African",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "aa2a2065-a641-4972-8c2a-6e4ba9f0edf2",
                name: "American",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "55e9e73c-41ed-4746-8230-29779dd28de7",
                name: "British",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "05833a31-c630-4842-b1c4-7ae962982ec3",
                name: "Caribbean",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "d0f94199-dfbc-4177-bc1e-ca8ac1bf6b78",
                name: "Chinese",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "350d707d-f4d0-47e0-b416-b7f75ba55b0c",
                name: "European",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "5b3234b8-b058-4734-a721-471b6d46d64f",
                name: "French",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "823fdf20-a8c2-4703-acf1-d68a75690d1b",
                name: "German",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "720d6df5-9297-4f13-8c99-7feb3578d80f",
                name: "Greek",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "98b0ac14-5b12-43c4-995d-7919c9eb03e6",
                name: "Japanese",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "b785e047-2b2e-42ca-9d5f-255824f1e80f",
                name: "Korean",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "27be6390-9910-4855-9559-815292792347",
                name: "Latin American",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "f40bd993-016d-4784-9907-4bc130a7eeda",
                name: "Mediterranean",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "a3183122-1650-4680-8a3c-006bade549a7",
                name: "Middle Eastern",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "62c58f6b-c6e9-4d42-96de-1e494cfeea73",
                name: "Spanish",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "3ec400ce-3c43-4e1b-93f9-f3b21c4c437e",
                name: "Thai",
                parentId: "bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5",
            },
            {
                tagId: "31945b3b-0f35-45b4-889a-a3a98f3a3ed5",
                name: "Vietnamese",
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

            {
                tagId: "4dbe2cc2-f67b-4108-8512-6dc2d63e7d74",
                name: "Season",
                description: "Season recipe is best suited for",
            },
            {
                tagId: "df4c350e-5464-4906-b888-9360290e1aec",
                name: "Summer",
                parentId: "4dbe2cc2-f67b-4108-8512-6dc2d63e7d74",
            },
            {
                tagId: "bcda96cd-3574-4438-8010-d2307e33ff43",
                name: "Winter",
                parentId: "4dbe2cc2-f67b-4108-8512-6dc2d63e7d74",
            },
            {
                tagId: "7d65d713-dc1e-4ed2-b78b-8e9548fc838d",
                name: "Spring",
                parentId: "4dbe2cc2-f67b-4108-8512-6dc2d63e7d74",
            },
            {
                tagId: "ef75b2ef-abf7-46e7-b170-7dd432d67566",
                name: "Autumn",
                parentId: "4dbe2cc2-f67b-4108-8512-6dc2d63e7d74",
            },

            {
                tagId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
                name: "Ingredient Category",
                description: "Category of ingredient",
            },
            {
                tagId: "9df831cd-2bb2-4055-ab1a-2ca1a7ef3f0b",
                name: "Vegetables",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "56aed225-b2fd-4597-b6ce-7f1611a6a805",
                name: "Spices and herbs",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "4b53d85b-d697-4934-b7cf-4d73d48f9ddb",
                name: "Cereals and legumes",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "ce86bc64-f7bc-4784-85a5-1023bac4f848",
                name: "Meats and poultry",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "3743d884-982b-476d-84a3-8917c3ffe12a",
                name: "Seafood",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "c2c8da48-c8ab-4b77-bc27-b34384bc5ae8",
                name: "Dairy",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "d049b20c-1221-4e9c-b773-3f3d41f20ff7",
                name: "Fruit",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "b9bf4104-69bd-434c-af5f-f8041dd25315",
                name: "Fats and oils",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "c7930747-3bb4-4fe1-ae22-24168676bc37",
                name: "Nuts and grains",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
            {
                tagId: "a631a4d8-2bc0-4560-89f2-4454d03181fe",
                name: "Pasta and rice",
                parentId: "fda85407-3dd8-453f-9f67-8208f8f5c0be",
            },
        ])
        .onConflict("tagId")
        .merge();
};
