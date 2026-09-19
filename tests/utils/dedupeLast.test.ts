import { describe, it } from "node:test";
import { expect } from "expect";
import { dedupeLast } from "../../src/utils/dedupeLast.ts";

describe("dedupeLast", () => {
    it("should return an empty array for empty input", () => {
        expect(dedupeLast<{ id: string }>([], "id")).toEqual([]);
    });

    it("should keep the last item for each key and preserve first-seen order", () => {
        const items = [
            { id: "a", value: 1 },
            { id: "b", value: 2 },
            { id: "a", value: 3 },
        ];

        expect(dedupeLast(items, "id")).toEqual([
            { id: "a", value: 3 },
            { id: "b", value: 2 },
        ]);
    });

    it("should dedupe by multiple properties", () => {
        const items = [
            { recipeId: "r1", ingredientId: "i1", amount: 1 },
            { recipeId: "r1", ingredientId: "i2", amount: 2 },
            { recipeId: "r2", ingredientId: "i1", amount: 3 },
            { recipeId: "r1", ingredientId: "i1", amount: 4 },
        ];

        expect(dedupeLast(items, "recipeId", "ingredientId")).toEqual([
            { recipeId: "r1", ingredientId: "i1", amount: 4 },
            { recipeId: "r1", ingredientId: "i2", amount: 2 },
            { recipeId: "r2", ingredientId: "i1", amount: 3 },
        ]);
    });

    it("should not dedupe items whose composite key differs", () => {
        const items = [
            { a: "x", b: "y:z" },
            { a: "x:y", b: "z" },
        ];

        expect(dedupeLast(items, "a", "b")).toEqual(items);
    });
});
