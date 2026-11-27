import { describe, it } from "node:test";
import { expect } from "expect";
import { ExtractionLimitError } from "../../src/utils/errors.ts";
import { MAX_MATCH_CANDIDATES } from "../../src/utils/extractionLimits.ts";
import { rankMatches } from "../../src/utils/ingredientMatching.ts";
import {
    CANDIDATE_LIMIT,
    CANDIDATE_MATCH_THRESHOLD,
    type IngredientCandidate,
    scoreIngredient,
} from "../../src/utils/ingredientRanking.ts";
import {
    createIngredientCandidate as candidate,
    runTestCases,
    type TestCase,
} from "../helpers/index.ts";

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

    it("should rank candidates from multiple surfaces as one list", () => {
        const matches = rankMatches(
            ["flour", "almond flour"],
            [candidate("flour"), candidate("almond flour")],
        );

        expect(matches.map(({ name }) => name)).toEqual([
            "flour",
            "almond flour",
        ]);
    });

    it("should reject more candidates than the matching limit", () => {
        const candidates = Array.from(
            { length: MAX_MATCH_CANDIDATES + 1 },
            (_, index) => candidate(`candidate ${index}`),
        );

        expect(() => rankMatches("candidate", candidates)).toThrow(
            ExtractionLimitError,
        );
    });
});
