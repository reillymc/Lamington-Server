import { describe, it } from "node:test";
import { expect } from "expect";
import type { components } from "../../src/routes/spec/schema.js";
import {
    AUTO_MATCH_THRESHOLD,
    CANDIDATE_LIMIT,
    CANDIDATE_MATCH_THRESHOLD,
    type IngredientCandidate,
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
    const testCases: TestCase<
        ReadonlyArray<string>,
        string,
        { candidates: ReadonlyArray<IngredientCandidate> }
    >[] = [
        {
            name: "should return candidates above threshold, sorted descending",
            input: "flour",
            update: {
                candidates: [
                    candidate("baking powder"),
                    candidate("corn flour"),
                    candidate("all-purpose flour"),
                    candidate("almond flour"),
                    candidate("self rising flour"),
                    candidate("white rice"),
                ],
            },
            expected: [
                "corn flour",
                "almond flour",
                "all-purpose flour",
                "self rising flour",
            ],
        },
        {
            name: "should exclude candidates below the threshold",
            input: "flour",
            update: {
                candidates: [candidate("garlic"), candidate("olive oil")],
            },
            expected: [],
        },
    ];

    runTestCases(testCases, ({ input, update, expected }) => {
        const matches = rankMatches(input, update!.candidates);

        expect(matches.map(({ name }) => name)).toEqual(expected);
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

    it("should cap the number of candidates", () => {
        const candidates = Array.from({ length: 10 }, (_, index) =>
            candidate(`candidate ${index}`),
        );

        // Names that share tokens so all candidates score above threshold
        const matches = rankMatches("candidate 1 generic extra", candidates);

        expect(matches.length).toBeLessThanOrEqual(CANDIDATE_LIMIT);
    });
});

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
        components["schemas"]["ExtractedRecipeIngredientItem"],
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
            name: "should attach candidates only while preserving parsed fields",
            input: {
                name: "Flour",
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

    runTestCases(testCases, ({ input, update, expected }) => {
        const result = matchRecipeIngredients(
            { ingredients: [{ name: "Ingredients", items: [input] }] },
            update!.candidates,
        );

        const item = result.ingredients?.[0]?.items[0];

        expect(item).toMatchObject(input);

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
