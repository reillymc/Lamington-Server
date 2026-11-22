import { describe, it } from "node:test";
import { expect } from "expect";
import { ExtractionLimitError } from "../../src/utils/errors.ts";
import { MAX_TAG_CANDIDATES } from "../../src/utils/extractionLimits.ts";
import { mapTagCandidates } from "../../src/utils/recipeTags.ts";

const tags = [
    { tagId: "group-cuisine", name: "Cuisine", parentId: undefined },
    { tagId: "tag-italian", name: "Italian", parentId: "group-cuisine" },
    { tagId: "group-meal", name: "Meal", parentId: undefined },
    { tagId: "tag-dinner", name: "Dinner", parentId: "group-meal" },
    { tagId: "group-dietary", name: "Dietary", parentId: undefined },
    { tagId: "tag-vegetarian", name: "Vegetarian", parentId: "group-dietary" },
    { tagId: "group-difficulty", name: "Difficulty", parentId: undefined },
    { tagId: "tag-easy", name: "Easy", parentId: "group-difficulty" },
    { tagId: "group-season", name: "Season", parentId: undefined },
    { tagId: "tag-summer", name: "Summer", parentId: "group-season" },
] as const;

describe("mapTagCandidates", () => {
    it("maps cuisine candidates using database tag ids", () => {
        expect(mapTagCandidates({ cuisine: ["italian"] }, tags)).toStrictEqual([
            { tagId: "tag-italian" },
        ]);
    });

    it("maps category candidates to meal tags", () => {
        expect(mapTagCandidates({ category: ["dinner"] }, tags)).toStrictEqual([
            { tagId: "tag-dinner" },
        ]);
    });

    it("maps keywords across groups", () => {
        const result = mapTagCandidates(
            { keywords: ["italian", "dinner", "easy"] },
            tags,
        );

        expect(result).toEqual(
            expect.arrayContaining([
                { tagId: "tag-italian" },
                { tagId: "tag-dinner" },
                { tagId: "tag-easy" },
            ]),
        );
    });

    it("deduplicates by tag id", () => {
        const result = mapTagCandidates(
            { cuisine: ["italian"], keywords: ["italian"] },
            tags,
        );

        expect(result).toStrictEqual([{ tagId: "tag-italian" }]);
    });

    it("does not map a candidate outside its configured groups", () => {
        expect(
            mapTagCandidates({ category: ["italian"] }, tags),
        ).toBeUndefined();
    });

    it("ignores unknown candidates", () => {
        expect(
            mapTagCandidates({ cuisine: ["not-a-tag"] }, tags),
        ).toBeUndefined();
    });

    it("returns undefined without candidates", () => {
        expect(mapTagCandidates(undefined, tags)).toBeUndefined();
    });

    it("enforces the total candidate limit", () => {
        expect(() =>
            mapTagCandidates(
                {
                    keywords: Array.from(
                        { length: MAX_TAG_CANDIDATES + 1 },
                        (_, index) => `candidate-${index}`,
                    ),
                },
                tags,
            ),
        ).toThrow(ExtractionLimitError);
    });
});
