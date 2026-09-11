import { describe, it } from "node:test";
import { expect } from "expect";
import type { Recipe } from "schema-dts";
import { Tags } from "../../src/database/seeds/production/01_default_tags.ts";
import type { components } from "../../src/routes/spec/schema.js";
import {
    convertRecipe,
    findRecipe,
    isRecipe,
} from "../../src/utils/recipeConverter.ts";
import { runTestCases, type TestCase } from "../helpers/index.ts";

describe("isRecipe", () => {
    const testCases: TestCase[] = [
        {
            name: "should return true for valid input",
            input: { "@type": "Recipe" },
            expected: true,
        },
        {
            name: "should return true for array type input",
            input: { "@type": ["Recipe", "CreativeWork"] },
            expected: true,
        },
        {
            name: "should return false for null input",
            input: null as unknown as object,
            expected: false,
        },
        {
            name: "should return false for empty object",
            input: {},
            expected: false,
        },
        {
            name: "should return false for wrong type",
            input: { "@type": "Person" },
            expected: false,
        },
    ];

    runTestCases(testCases, ({ input, expected }) => {
        expect(isRecipe(input)).toBe(expected);
    });
});

describe("findRecipe", () => {
    const recipe = { "@type": "Recipe", name: "Test" };

    const testCases: TestCase[] = [
        {
            name: "should return recipe if input is recipe",
            input: recipe,
            expected: recipe,
        },
        {
            name: "should find recipe in array",
            input: [recipe],
            expected: recipe,
        },
        {
            name: "should find recipe in @graph",
            input: { "@context": "https://schema.org", "@graph": [recipe] },
            expected: recipe,
        },
        {
            name: "should find recipe nested in array and graph",
            input: [{ "@graph": [recipe] }],
            expected: recipe,
        },
        {
            name: "should find recipe in @graph as object",
            input: { "@context": "https://schema.org", "@graph": recipe },
            expected: recipe,
        },
        {
            name: "should return undefined if no recipe found",
            input: { "@type": "Person" },
            expected: undefined,
        },
    ];

    runTestCases(testCases, ({ input, expected }) => {
        expect(findRecipe(input)).toEqual(expected);
    });
});

describe("convertRecipe", () => {
    const baseRecipe: Recipe = {
        "@type": "Recipe",
        name: "Test Recipe",
    };

    it("should extract recipe name", () => {
        const result = convertRecipe(baseRecipe);
        expect(result.name).toBe("Test Recipe");
    });

    describe("source", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["source"]
        >[] = [
            {
                name: "should extract recipe source from id property",
                input: { "@id": "https://example.com/recipe" },
                expected: "https://example.com/recipe",
            },
            {
                name: "should extract recipe source from url property if @id is missing",
                input: { url: "https://example.com/recipe-url" },
                expected: "https://example.com/recipe-url",
            },
            {
                name: "should extract recipe source from mainEntityOfPage if @id and url are missing",
                input: {
                    mainEntityOfPage: {
                        "@type": "WebPage",
                        "@id": "https://example.com/recipe-main-entity",
                    },
                },
                expected: "https://example.com/recipe-main-entity",
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });
            expect(result.source).toBe(expected);
        });
    });

    it("should extract recipe summary", () => {
        const recipe: Recipe = {
            "@type": "Recipe",
            name: "Summary Test",
            description: "A delicious test recipe.",
        };
        const result = convertRecipe(recipe);
        expect(result.summary).toBe("A delicious test recipe.");
    });

    describe("prep time", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["prepTime"]
        >[] = [
            {
                name: "should extract minutes",
                input: { prepTime: "PT20M" },
                expected: 20,
            },
            {
                name: "should extract hours",
                input: { prepTime: "PT1H" },
                expected: 60,
            },
            {
                name: "should extract minutes and hours",
                input: { prepTime: "PT1H30M" },
                expected: 90,
            },
            {
                name: "should extract days",
                input: { prepTime: "P1DT2H" },
                expected: 1560,
            },
            {
                name: "should extract from array",
                input: { prepTime: ["PT20M"] },
                expected: 20,
            },
            {
                name: "should return undefined for invalid duration",
                input: { prepTime: "invalid" },
                expected: undefined,
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });
            expect(result.prepTime).toBe(expected);
        });
    });

    describe("cook time", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["cookTime"]
        >[] = [
            {
                name: "should extract minutes",
                input: { cookTime: "PT20M" },
                expected: 20,
            },
            {
                name: "should extract hours",
                input: { cookTime: "PT1H" },
                expected: 60,
            },
            {
                name: "should extract minutes and hours",
                input: { cookTime: "PT1H30M" },
                expected: 90,
            },
            {
                name: "should extract days",
                input: { cookTime: "P1DT2H" },
                expected: 1560,
            },
            {
                name: "should extract from array",
                input: { cookTime: ["PT20M"] },
                expected: 20,
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });
            expect(result.cookTime).toBe(expected);
        });
    });

    describe("servings", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["servings"]
        >[] = [
            {
                name: "should extract string servings correctly",
                input: { recipeYield: "4" },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "",
                },
            },
            {
                name: "should extract string servings with unit correctly",
                input: { recipeYield: "4 People" },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "People",
                },
            },
            {
                name: "should extract number servings correctly",
                input: { recipeYield: 4 },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "",
                },
            },
            {
                name: "should extract array servings correctly",
                input: { recipeYield: ["4"] },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "",
                },
            },
            {
                name: "should extract most detailed of array servings correctly",
                input: { recipeYield: ["4 People"] },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "People",
                },
            },
            {
                name: "should extract range servings correctly",
                input: { recipeYield: "4 - 6" },
                expected: {
                    count: { representation: "range", value: ["4", "6"] },
                    unit: "",
                },
            },
            {
                name: "should extract range servings with unit correctly",
                input: { recipeYield: "4 - 6 People" },
                expected: {
                    count: { representation: "range", value: ["4", "6"] },
                    unit: "People",
                },
            },
            {
                name: "should extract range servings correctly with 'to' separator",
                input: { recipeYield: "4 to 6" },
                expected: {
                    count: { representation: "range", value: ["4", "6"] },
                    unit: "",
                },
            },
            {
                name: "should extract the most descriptive serving from an array",
                input: { recipeYield: ["4", "4 servings"] },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "servings",
                },
            },
            {
                name: "should extract servings from a string with a prefix",
                input: { recipeYield: "Yield: 12 muffins" },
                expected: {
                    count: { representation: "number", value: "12" },
                    unit: "muffins",
                },
            },
            {
                name: "should extract range servings from a string with a prefix",
                input: { recipeYield: "Makes: 8-10 cookies" },
                expected: {
                    count: { representation: "range", value: ["8", "10"] },
                    unit: "cookies",
                },
            },
            {
                name: "should truncate an excessively long single value unit",
                input: { recipeYield: `4 ${"x".repeat(300)}` },
                expected: {
                    count: { representation: "number", value: "4" },
                    unit: "x".repeat(255),
                },
            },
            {
                name: "should truncate an excessively long range unit",
                input: { recipeYield: `8-10 ${"x".repeat(300)}` },
                expected: {
                    count: { representation: "range", value: ["8", "10"] },
                    unit: "x".repeat(255),
                },
            },
            {
                name: "should handle parseYield with empty array",
                input: { recipeYield: [] },
                expected: undefined,
            },
            {
                name: "should handle parseYield with null value",
                input: { recipeYield: null as unknown as string },
                expected: undefined,
            },
            {
                name: "should return undefined for invalid yield",
                input: { recipeYield: "invalid" },
                expected: undefined,
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });
            expect(result.servings).toEqual(expected);
        });
    });

    describe("image", () => {
        const testCases: TestCase<
            NonNullable<
                components["schemas"]["ExtractedRecipe"]["additionalData"]
            >["imageUrl"]
        >[] = [
            {
                name: "should extract simple string image url",
                input: { image: "https://example.com/image.jpg" },
                expected: "https://example.com/image.jpg",
            },
            {
                name: "should extract image url from ImageObject",
                input: {
                    image: {
                        "@type": "ImageObject",
                        url: "https://example.com/image.jpg",
                    },
                },
                expected: "https://example.com/image.jpg",
            },
            {
                name: "should extract image url from array of ImageObjects",
                input: {
                    image: [
                        {
                            "@type": "ImageObject",
                            url: "https://example.com/image1.jpg",
                        },
                    ],
                },
                expected: "https://example.com/image1.jpg",
            },
            {
                name: "should extract image url from contentUrl if url is missing",
                input: {
                    image: {
                        "@type": "ImageObject",
                        contentUrl: "https://example.com/content.jpg",
                    },
                },
                expected: "https://example.com/content.jpg",
            },
            {
                name: "should extract the largest image from an array of resized images",
                input: {
                    image: [
                        "https://example.com/image-225x225.jpg",
                        "https://example.com/image-260x195.jpg",
                        "https://example.com/image.jpg",
                        "https://example.com/image-320x180.jpg",
                    ],
                },
                expected: "https://example.com/image.jpg",
            },
            {
                name: "should prioritize image with largest dimensions specified in object",
                input: {
                    image: [
                        {
                            "@type": "ImageObject",
                            url: "https://example.com/small.jpg",
                            width: "100",
                            height: "100",
                        },
                        {
                            "@type": "ImageObject",
                            url: "https://example.com/large.jpg",
                            width: "1000",
                            height: "1000",
                        },
                    ],
                },
                expected: "https://example.com/large.jpg",
            },
            {
                name: "should handle image object with no url properties",
                input: {
                    image: {
                        "@type": "ImageObject",
                    },
                },
                expected: undefined,
            },
            {
                name: "should handle image array with mixed valid and invalid objects",
                input: {
                    image: [
                        {
                            "@type": "ImageObject",
                        },
                        "https://example.com/valid.jpg",
                        {
                            contentUrl: "https://example.com/content.jpg",
                        },
                    ],
                },
                expected: "https://example.com/valid.jpg",
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });
            expect(result.additionalData!.imageUrl).toBe(expected);
        });
    });

    describe("method", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["method"]
        >[] = [
            {
                name: "should parse string instructions",
                input: { recipeInstructions: ["Step 1", "Step 2"] },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Step 1" }, { content: "Step 2" }],
                    },
                ],
            },
            {
                name: "should parse HowToStep instructions",
                input: {
                    recipeInstructions: [
                        { "@type": "HowToStep", text: "Step 1" },
                        { "@type": "HowToStep", text: "Step 2" },
                    ],
                },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Step 1" }, { content: "Step 2" }],
                    },
                ],
            },
            {
                name: "should parse HowToStep instructions using name if text is missing",
                input: {
                    recipeInstructions: [
                        { "@type": "HowToStep", name: "Step 1 Name" },
                    ],
                },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Step 1 Name" }],
                    },
                ],
            },
            {
                name: "should parse HowToSection instructions",
                input: {
                    recipeInstructions: [
                        {
                            "@type": "HowToSection",
                            name: "Prep",
                            itemListElement: [
                                { "@type": "HowToStep", text: "Chop" },
                            ],
                        },
                        {
                            "@type": "HowToSection",
                            name: "Cook",
                            itemListElement: ["Fry"],
                        },
                    ],
                },
                expected: [
                    {
                        name: "Prep",
                        items: [{ content: "Chop" }],
                    },
                    {
                        name: "Cook",
                        items: [{ content: "Fry" }],
                    },
                ],
            },
            {
                name: "should handle single string instruction",
                input: { recipeInstructions: "Just cook it." },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Just cook it." }],
                    },
                ],
            },
            {
                name: "should handle mixed HowToSection and top-level steps",
                input: {
                    recipeInstructions: [
                        "Preheat oven",
                        {
                            "@type": "HowToSection",
                            name: "Bake",
                            itemListElement: ["Put in oven"],
                        },
                        "Cool down",
                    ],
                },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Preheat oven" }],
                    },
                    {
                        name: "Bake",
                        items: [{ content: "Put in oven" }],
                    },
                    {
                        name: "Method",
                        items: [{ content: "Cool down" }],
                    },
                ],
            },
            {
                name: "should parse multiple HowToSections with HowToSteps",
                input: {
                    recipeInstructions: [
                        {
                            "@type": "HowToSection",
                            name: "Preparation",
                            itemListElement: [
                                {
                                    "@type": "HowToStep",
                                    text: "Wash vegetables",
                                },
                                { "@type": "HowToStep", text: "Dice onions" },
                            ],
                        },
                        {
                            "@type": "HowToSection",
                            name: "Cooking",
                            itemListElement: [
                                { "@type": "HowToStep", text: "Heat oil" },
                                { "@type": "HowToStep", text: "Sauté onions" },
                            ],
                        },
                    ],
                },
                expected: [
                    {
                        name: "Preparation",
                        items: [
                            { content: "Wash vegetables" },
                            { content: "Dice onions" },
                        ],
                    },
                    {
                        name: "Cooking",
                        items: [
                            { content: "Heat oil" },
                            { content: "Sauté onions" },
                        ],
                    },
                ],
            },
            {
                name: "should handle instructions with plain object step (no @type)",
                input: {
                    recipeInstructions: [
                        {
                            text: "Step without type property",
                        },
                    ],
                },
                expected: [
                    {
                        name: "Method",
                        items: [
                            {
                                content: "Step without type property",
                            },
                        ],
                    },
                ],
            },
            {
                name: "should handle instructions with empty object",
                input: {
                    recipeInstructions: [{}, "Regular step"],
                },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Regular step" }],
                    },
                ],
            },
            {
                name: "should handle empty HowToSection with no itemListElement",
                input: {
                    recipeInstructions: [
                        {
                            "@type": "HowToSection",
                            name: "Prep",
                        },
                    ],
                },
                expected: [],
            },
            {
                name: "should ignore instructions with unknown type",
                input: {
                    recipeInstructions: [
                        { "@type": "UnknownType", text: "Should be ignored" },
                        "Valid step",
                    ],
                },
                expected: [
                    {
                        name: "Method",
                        items: [{ content: "Valid step" }],
                    },
                ],
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });

            expect(result.method).toStrictEqual(expected);
        });
    });

    describe("ingredients", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["ingredients"]
        >[] = [
            {
                name: "should parse simple ingredient",
                input: { recipeIngredient: ["Garlic"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [{ name: "Garlic" }],
                    },
                ],
            },
            {
                name: "should parse simple hyphenated ingredient",
                input: { recipeIngredient: ["Extra-virgin olive oil"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [{ name: "Extra-virgin olive oil" }],
                    },
                ],
            },
            {
                name: "should parse simple slashed ingredient",
                input: { recipeIngredient: ["sunflower / vegetable oil"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [{ name: "sunflower / vegetable oil" }],
                    },
                ],
            },
            {
                name: "should parse ingredient with number amount",
                input: { recipeIngredient: ["1 Onion"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "Onion",
                                amount: {
                                    representation: "number",
                                    value: "1",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with number and unit",
                input: { recipeIngredient: ["2 Tbsp olive oil"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "olive oil",
                                unit: "tbsp",
                                amount: {
                                    representation: "number",
                                    value: "2",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with number and unit without spaces",
                input: { recipeIngredient: ["250g smooth ricotta"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "smooth ricotta",
                                unit: "g",
                                amount: {
                                    representation: "number",
                                    value: "250",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with number range",
                input: { recipeIngredient: ["2-3 slices of Halloumi cheese"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "slices of Halloumi cheese",
                                amount: {
                                    representation: "range",
                                    value: ["2", "3"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with number range using 'to' separator",
                input: {
                    recipeIngredient: ["2 to 3 slices of Halloumi cheese"],
                },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "slices of Halloumi cheese",
                                amount: {
                                    representation: "range",
                                    value: ["2", "3"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with simple fraction",
                input: { recipeIngredient: ["1/2 lemon"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "lemon",
                                amount: {
                                    representation: "fraction",
                                    value: ["0", "1", "2"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with unicode fraction",
                input: { recipeIngredient: ["¼ lemon"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "lemon",
                                amount: {
                                    representation: "fraction",
                                    value: ["0", "1", "4"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with whole number and simple fraction",
                input: { recipeIngredient: ["1 1/4 lemon"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "lemon",
                                amount: {
                                    representation: "fraction",
                                    value: ["1", "1", "4"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with whole number and unicode fraction",
                input: { recipeIngredient: ["1 ½ lemon"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "lemon",
                                amount: {
                                    representation: "fraction",
                                    value: ["1", "1", "2"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with encoded fraction",
                input: { recipeIngredient: ["&#8531 potato"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "potato",
                                amount: {
                                    representation: "fraction",
                                    value: ["0", "1", "3"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with decimal fraction",
                input: { recipeIngredient: ["0.25 cup grated parmesan"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "grated parmesan",
                                unit: "cup",
                                amount: {
                                    representation: "fraction",
                                    value: ["0", "1", "4"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with fraction range",
                input: {
                    recipeIngredient: [
                        "¼-½ teaspoon crushed red pepper flakes",
                    ],
                },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "crushed red pepper flakes",
                                unit: "teaspoon",
                                amount: {
                                    representation: "range",
                                    value: ["1/4", "1/2"],
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with notes (bracket denoted)",
                input: { recipeIngredient: ["2  garlic cloves (minced)"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "garlic cloves",
                                preparation: "minced",
                                amount: {
                                    representation: "number",
                                    value: "2",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with notes (double bracket denoted)",
                input: {
                    recipeIngredient: [
                        "1 oz tomato paste ((double strength, Italian))",
                    ],
                },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "tomato paste",
                                preparation: "double strength, Italian",
                                unit: "oz",
                                amount: {
                                    representation: "number",
                                    value: "1",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with notes (comma denoted)",
                input: {
                    recipeIngredient: ["2 lemon, 1 juiced, 1 sliced"],
                },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "lemon",
                                preparation: "1 juiced, 1 sliced",
                                amount: {
                                    representation: "number",
                                    value: "2",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should parse ingredient with amount after name",
                input: {
                    recipeIngredient: ["Water, 150 g"],
                },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "Water",
                                unit: "g",
                                amount: {
                                    representation: "number",
                                    value: "150",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should handle empty ingredient list",
                input: { recipeIngredient: [] },
                expected: [],
            },
            {
                name: "should handle HTML tags in ingredient names",
                input: { recipeIngredient: ["1 cup <b>flour</b>"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "flour",
                                unit: "cup",
                                amount: {
                                    representation: "number",
                                    value: "1",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should handle HTML entities in ingredient description",
                input: { recipeIngredient: ["1 apple (sliced &amp; peeled)"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "apple",
                                preparation: "sliced & peeled",
                                amount: {
                                    representation: "number",
                                    value: "1",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should handle ingredient with decimal amount that doesn't match common fractions",
                input: { recipeIngredient: ["2.7 cups flour"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "flour",
                                unit: "cups",
                                amount: {
                                    representation: "number",
                                    value: "2.7",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                name: "should handle ingredients with empty string parts",
                input: { recipeIngredient: [""] },
                expected: [],
            },
            {
                name: "should parse ingredient with unknown unit",
                input: { recipeIngredient: ["1 unknown_unit ingredient"] },
                expected: [
                    {
                        name: "Ingredients",
                        items: [
                            {
                                name: "unknown_unit ingredient",
                                amount: {
                                    representation: "number",
                                    value: "1",
                                },
                            },
                        ],
                    },
                ],
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });

            expect(result.ingredients).toStrictEqual(expected);
        });
    });

    describe("tags", () => {
        const testCases: TestCase<
            components["schemas"]["ExtractedRecipe"]["tags"]
        >[] = [
            {
                name: "should extract a cuisine tag",
                input: { recipeCuisine: ["Italian"] },
                expected: [{ tagId: Tags.Cuisine.Italian }],
            },
            {
                name: "should extract a course tag",
                input: { recipeCategory: ["Dinner"] },
                expected: [{ tagId: Tags.Meal.Dinner }],
            },
            {
                name: "should extract multiple tags",
                input: { recipeCuisine: ["Indian"], recipeCategory: ["Lunch"] },
                expected: [
                    { tagId: Tags.Meal.Lunch },
                    { tagId: Tags.Cuisine.Indian },
                ],
            },
            {
                name: "should extract tags from keywords string",
                input: { keywords: "Italian, Dinner" },
                expected: [
                    { tagId: Tags.Cuisine.Italian },
                    { tagId: Tags.Meal.Dinner },
                ],
            },
            {
                name: "should extract tags from keywords array",
                input: { keywords: ["Italian", "Dinner"] },
                expected: [
                    { tagId: Tags.Cuisine.Italian },
                    { tagId: Tags.Meal.Dinner },
                ],
            },
        ];

        runTestCases(testCases, ({ input, expected }) => {
            const result = convertRecipe({ ...baseRecipe, ...input });

            const sortTags = (tags: typeof result.tags) =>
                tags
                    ? [...tags].sort((a, b) => a.tagId.localeCompare(b.tagId))
                    : tags;

            expect(sortTags(result.tags)).toStrictEqual(sortTags(expected));
        });
    });
});
