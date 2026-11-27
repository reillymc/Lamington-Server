import { describe, it } from "node:test";
import { expect } from "expect";
import type { components as extractorComponents } from "../../src/integrations/extractor/spec/index.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { ExtractionLimitError } from "../../src/utils/errors.ts";
import { MAX_MATCH_CANDIDATES } from "../../src/utils/extractionLimits.ts";
import {
    AUTO_MATCH_THRESHOLD,
    matchRecipeIngredients,
} from "../../src/utils/ingredientMatching.ts";
import type { IngredientCandidate } from "../../src/utils/ingredientRanking.ts";
import {
    createIngredientCandidate as candidate,
    runTestCases,
    type TestCase,
} from "../helpers/index.ts";

describe("matchRecipeIngredients", () => {
    const candidates = [
        candidate("garlic"),
        candidate("egg", "eggs"),
        candidate("corn flour"),
        candidate("all-purpose flour"),
        candidate("almond flour"),
        candidate("baking powder"),
    ];

    type ExpectedItem = {
        ingredient?: {
            ingredientId: string;
            name: string;
            namePlural?: string;
        };
        candidateNames?: ReadonlyArray<string>;
    };

    const testCases: TestCase<
        ExpectedItem,
        extractorComponents["schemas"]["ExtractedRecipeIngredientItem"],
        { candidates: ReadonlyArray<IngredientCandidate> }
    >[] = [
        {
            name: "should auto-match a confident name and include candidates",
            input: { name: "Garlic" },
            update: { candidates },
            expected: {
                ingredient: { ingredientId: "garlic-id", name: "garlic" },
                candidateNames: ["garlic"],
            },
        },
        {
            name: "should include namePlural on the auto match when present",
            input: { name: "eggs" },
            update: { candidates },
            expected: {
                ingredient: {
                    ingredientId: "egg-id",
                    name: "egg",
                    namePlural: "eggs",
                },
                candidateNames: ["egg"],
            },
        },
        {
            name: "should use variants while preserving parsed fields",
            input: {
                raw: "2 cups plain flour, sifted",
                name: "Flour",
                variants: ["plain flour", "all-purpose flour"],
                preparation: "sifted",
                unit: "cups",
                amount: { representation: "number", value: "2" },
            },
            update: { candidates },
            expected: {
                candidateNames: [
                    "corn flour",
                    "almond flour",
                    "all-purpose flour",
                ],
            },
        },
        {
            name: "should auto-match a strong variant when the name does not overlap",
            input: {
                name: "Plain",
                variants: ["all-purpose flour"],
            },
            update: { candidates },
            expected: {
                ingredient: {
                    ingredientId: "all-purpose flour-id",
                    name: "all-purpose flour",
                },
                candidateNames: ["all-purpose flour"],
            },
        },
        {
            name: "should match a variants-only item",
            input: { variants: ["all-purpose flour"] },
            update: { candidates },
            expected: {
                ingredient: {
                    ingredientId: "all-purpose flour-id",
                    name: "all-purpose flour",
                },
                candidateNames: ["all-purpose flour"],
            },
        },
        {
            name: "should merge and sort candidates from the name and variants",
            input: {
                name: "flour",
                variants: ["almond flour", "corn flour"],
            },
            update: {
                candidates: [
                    candidate("corn flour"),
                    candidate("almond flour"),
                    candidate("all-purpose flour"),
                ],
            },
            expected: {
                candidateNames: ["corn flour", "almond flour"],
            },
        },
        {
            name: "should preserve identity descriptors for exact matches",
            input: { name: "fresh basil" },
            update: {
                candidates: [candidate("fresh basil"), candidate("basil")],
            },
            expected: {
                ingredient: {
                    ingredientId: "fresh basil-id",
                    name: "fresh basil",
                },
                candidateNames: ["fresh basil", "basil"],
            },
        },
        {
            name: "should preserve packaged preparation descriptors",
            input: { name: "crushed tomatoes" },
            update: {
                candidates: [
                    candidate("crushed tomatoes"),
                    candidate("tomatoes"),
                ],
            },
            expected: {
                ingredient: {
                    ingredientId: "crushed tomatoes-id",
                    name: "crushed tomatoes",
                },
                candidateNames: ["crushed tomatoes", "tomatoes"],
            },
        },
        {
            name: "should still return descriptor candidates for a plain name",
            input: { name: "tomatoes" },
            update: {
                candidates: [
                    candidate("crushed tomatoes"),
                    candidate("tomatoes"),
                ],
            },
            expected: {
                ingredient: {
                    ingredientId: "tomatoes-id",
                    name: "tomatoes",
                },
                candidateNames: ["tomatoes", "crushed tomatoes"],
            },
        },
        {
            name: "should leave items unchanged when no candidate is close enough",
            input: { name: "Mystery ingredient" },
            update: { candidates },
            expected: {},
        },
        {
            name: "should handle slash-separated alternatives",
            input: { name: "sunflower / vegetable oil" },
            update: {
                candidates: [
                    candidate("sunflower oil"),
                    candidate("vegetable oil"),
                ],
            },
            expected: {
                candidateNames: ["sunflower oil", "vegetable oil"],
            },
        },
    ];

    it("should bound matching work across recipe items", () => {
        const candidates = Array.from({ length: MAX_MATCH_CANDIDATES }, () =>
            candidate("shared"),
        );
        const recipe = {
            ingredients: [
                {
                    name: "Ingredients",
                    items: Array.from({ length: 101 }, () => ({
                        name: "shared",
                    })),
                },
            ],
        } as components["schemas"]["ExtractedRecipe"];

        expect(() => matchRecipeIngredients(recipe, candidates)).toThrow(
            ExtractionLimitError,
        );
    });

    runTestCases(testCases, ({ input, update, expected }) => {
        const result = matchRecipeIngredients(
            { ingredients: [{ name: "Ingredients", items: [input] }] },
            update!.candidates,
        );

        const item = result.ingredients?.[0]?.items[0];
        const { variants: _variants, ...expectedItem } = input;

        expect(item).toMatchObject(expectedItem);
        expect(item).not.toHaveProperty("variants");

        if (expected.ingredient) {
            expect(item?.ingredient).toEqual(expected.ingredient);
        } else {
            expect(item?.ingredient).toBeUndefined();
        }

        if (expected.candidateNames) {
            expect(item?.ingredientCandidates?.map(({ name }) => name)).toEqual(
                expected.candidateNames,
            );
            if (!expected.ingredient) {
                for (const match of item!.ingredientCandidates!) {
                    expect(match.score).toBeLessThan(AUTO_MATCH_THRESHOLD);
                }
            }
        } else {
            expect(item?.ingredientCandidates).toBeUndefined();
        }
    });

    it("should preserve other recipe fields", () => {
        const result = matchRecipeIngredients(
            {
                name: "Test Recipe",
                ingredients: [
                    { name: "Ingredients", items: [{ name: "Garlic" }] },
                ],
            },
            candidates,
        );

        expect(result.name).toBe("Test Recipe");
    });
});
