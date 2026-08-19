import { describe, it } from "node:test";
import { expect } from "expect";
import type { components } from "../../src/routes/spec/schema.js";
import {
    AUTO_MATCH_THRESHOLD,
    CANDIDATE_LIMIT,
    CANDIDATE_MATCH_THRESHOLD,
    createIngredientMatcher,
    type IngredientCandidate,
    type IngredientMatcher,
    matchIngredient,
    matchRecipeIngredients,
    normalizeIngredientName,
    rankMatches,
    scoreIngredient,
} from "../../src/utils/ingredientMatcher.ts";
import { runTestCases, type TestCase } from "../helpers/index.ts";

const candidate = (
    name: string,
    namePlural?: string,
    ingredientId = `${name}-id`,
): IngredientCandidate => ({
    ingredientId,
    name,
    namePlural,
});

describe("normalizeIngredientName", () => {
    const testCases: TestCase<string, string>[] = [
        {
            name: "should lowercase and collapse whitespace",
            input: "  Two   Cups   Flour  ",
            expected: "two cups flour",
        },
        {
            name: "should turn hyphens into spaces",
            input: "extra-virgin olive oil",
            expected: "extra virgin olive oil",
        },
        {
            name: "should strip fractions and prep descriptors",
            input: "½ Some FRESH Spinach",
            expected: "spinach",
        },
        {
            name: "should strip stopwords and descriptors",
            input: "Slices of Halloumi Cheese",
            expected: "halloumi cheese",
        },
        {
            name: "should turn slash separators into spaces",
            input: "sunflower / vegetable oil",
            expected: "sunflower vegetable oil",
        },
        {
            name: "should return empty string for empty input",
            input: "",
            expected: "",
        },
    ];

    runTestCases(testCases, ({ input, expected }) => {
        expect(normalizeIngredientName(input)).toBe(expected);
    });
});

describe("scoreIngredient", () => {
    const testCases: TestCase<
        number,
        string,
        { candidate: IngredientCandidate }
    >[] = [
        {
            name: "should score exact name match as 1",
            input: "Garlic",
            update: { candidate: candidate("garlic") },
            expected: 1,
        },
        {
            name: "should score exact plural match as 1",
            input: "eggs",
            update: { candidate: candidate("egg", "eggs") },
            expected: 1,
        },
        {
            name: "should score partial token overlap between 0 and 1",
            input: "flour",
            update: { candidate: candidate("all-purpose flour") },
            expected: 0.5,
        },
        {
            name: "should score shared tokens below the exact match",
            input: "smoked halloumi cheese",
            update: { candidate: candidate("halloumi cheese") },
            expected: 0.8235,
        },
        {
            name: "should score no overlap as 0",
            input: "soy sauce",
            update: { candidate: candidate("garlic") },
            expected: 0,
        },
        {
            name: "should score empty extracted name as 0",
            input: "",
            update: { candidate: candidate("garlic") },
            expected: 0,
        },
    ];

    runTestCases(testCases, ({ input, update, expected }) => {
        expect(scoreIngredient(input, update!.candidate)).toBeCloseTo(
            expected,
            4,
        );
    });
});

describe("rankMatches", () => {
    it("should return candidates above threshold, sorted descending with fields", () => {
        const matches = rankMatches("flour", [
            candidate("baking powder"),
            candidate("corn flour"),
            candidate("all-purpose flour"),
            candidate("almond flour"),
            candidate("self rising flour"),
            candidate("white rice"),
        ]);

        expect(matches.length).toBeGreaterThan(1);
        for (const match of matches) {
            expect(match.score).toBeGreaterThanOrEqual(
                CANDIDATE_MATCH_THRESHOLD,
            );
            expect(match.ingredientId).toBeTruthy();
            expect(match.name).toBeTruthy();
            expect(typeof match.score).toBe("number");
        }
        for (let i = 1; i < matches.length; i++) {
            expect(matches[i - 1]!.score).toBeGreaterThanOrEqual(
                matches[i]!.score,
            );
        }
    });

    it("should exclude candidates below the threshold", () => {
        const matches = rankMatches("flour", [
            candidate("garlic"),
            candidate("olive oil"),
        ]);

        expect(matches).toEqual([]);
    });

    it("should cap the number of candidates", () => {
        const candidates = Array.from({ length: 10 }, (_, index) =>
            candidate(`candidate ${index}`),
        );

        // Names that share tokens so all candidates score above threshold
        const matches = rankMatches("candidate 1 generic extra", candidates);

        expect(matches.length).toBeLessThanOrEqual(CANDIDATE_LIMIT);
    });
});

describe("matchIngredient", () => {
    const candidates = [
        candidate("garlic"),
        candidate("egg", "eggs"),
        candidate("halloumi cheese"),
        candidate("all-purpose flour"),
        candidate("corn flour"),
        candidate("almond flour"),
    ];

    it("should return the match above the auto-match threshold", () => {
        expect(matchIngredient("Garlic", candidates)).toMatchObject({
            ingredientId: "garlic-id",
            name: "garlic",
            score: 1,
        });
    });

    it("should match via plural form", () => {
        expect(matchIngredient("eggs", candidates)).toMatchObject({
            ingredientId: "egg-id",
            name: "egg",
            score: 1,
        });
    });

    it("should return undefined below the auto-match threshold", () => {
        expect(matchIngredient("flour", candidates)).toBeUndefined();
    });
});

describe("createIngredientMatcher", () => {
    it("should auto-match a confident name and include candidates", () => {
        const matcher = createIngredientMatcher([
            candidate("garlic"),
            candidate("olive oil"),
        ]);

        expect(matcher("Garlic")).toEqual({
            ingredient: { ingredientId: "garlic-id", name: "garlic" },
            candidates: [
                { ingredientId: "garlic-id", name: "garlic", score: 1 },
            ],
        });
    });

    it("should include namePlural on the auto match when present", () => {
        const matcher = createIngredientMatcher([candidate("egg", "eggs")]);

        expect(matcher("eggs")?.ingredient).toEqual({
            ingredientId: "egg-id",
            name: "egg",
            namePlural: "eggs",
        });
    });

    it("should return candidates only below the auto-match threshold", () => {
        const matcher = createIngredientMatcher([
            candidate("corn flour"),
            candidate("all-purpose flour"),
            candidate("almond flour"),
            candidate("baking powder"),
        ]);

        const result = matcher("flour");

        expect(result?.ingredient).toBeUndefined();
        expect(result?.candidates?.length).toBeGreaterThan(0);
        for (const candidate of result!.candidates!) {
            expect(candidate.score).toBeLessThan(AUTO_MATCH_THRESHOLD);
        }
    });

    it("should return undefined when nothing is close", () => {
        const matcher = createIngredientMatcher([candidate("garlic")]);

        expect(matcher("quantum filament")).toBeUndefined();
    });

    it("should handle slash-separated alternatives", () => {
        const matcher = createIngredientMatcher([
            candidate("sunflower oil"),
            candidate("vegetable oil"),
        ]);

        const result = matcher("sunflower / vegetable oil");

        expect(result?.ingredient).toBeUndefined();
        expect(result?.candidates?.length).toBe(2);
    });
});

describe("matchRecipeIngredients", () => {
    const matcher: IngredientMatcher = (name) =>
        name === "Garlic"
            ? {
                  ingredient: {
                      ingredientId: "garlic-id",
                      name: "garlic",
                      namePlural: "garlic",
                  },
                  candidates: [
                      { ingredientId: "garlic-id", name: "garlic", score: 1 },
                  ],
              }
            : name === "Flour"
              ? {
                    ingredient: undefined,
                    candidates: [
                        {
                            ingredientId: "corn-flour-id",
                            name: "corn flour",
                            score: 0.77,
                        },
                    ],
                }
              : undefined;

    const recipe = (
        items: components["schemas"]["RecipeIngredientItem"][],
    ): components["schemas"]["ExtractedRecipe"] => ({
        ingredients: [{ name: "Ingredients", items }],
    });

    it("should attach matched ingredient and candidates", () => {
        const result = matchRecipeIngredients(
            recipe([{ name: "Garlic" }]),
            matcher,
        );

        expect(result.ingredients?.[0]?.items[0]).toEqual({
            name: "Garlic",
            ingredient: {
                ingredientId: "garlic-id",
                name: "garlic",
                namePlural: "garlic",
            },
            ingredientCandidates: [
                { ingredientId: "garlic-id", name: "garlic", score: 1 },
            ],
        });
    });

    it("should attach candidates only while preserving parsed fields", () => {
        const result = matchRecipeIngredients(
            recipe([
                {
                    name: "Flour",
                    unit: "cups",
                    amount: { representation: "number", value: "2" },
                },
            ]),
            matcher,
        );

        expect(result.ingredients?.[0]?.items[0]).toEqual({
            name: "Flour",
            unit: "cups",
            amount: { representation: "number", value: "2" },
            ingredient: undefined,
            ingredientCandidates: [
                {
                    ingredientId: "corn-flour-id",
                    name: "corn flour",
                    score: 0.77,
                },
            ],
        });
    });

    it("should leave items unchanged when matcher returns nothing", () => {
        const result = matchRecipeIngredients(
            recipe([{ name: "Mystery ingredient" }]),
            matcher,
        );

        expect(result.ingredients?.[0]?.items[0]).toEqual({
            name: "Mystery ingredient",
        });
    });

    it("should preserve other recipe fields", () => {
        const result = matchRecipeIngredients(
            {
                name: "Test Recipe",
                ingredients: [
                    { name: "Ingredients", items: [{ name: "Garlic" }] },
                ],
            },
            matcher,
        );

        expect(result.name).toBe("Test Recipe");
    });
});
