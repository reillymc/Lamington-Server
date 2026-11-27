import { describe } from "node:test";
import { expect } from "expect";
import { normalizeIngredientSearchText } from "../../src/utils/ingredientSearchNormalization.ts";
import { runTestCases, type TestCase } from "../helpers/index.ts";

describe("normalizeIngredientSearchText", () => {
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
            name: "should preserve identity descriptors while stripping fractions",
            input: "½ Some FRESH Spinach",
            expected: "fresh spinach",
        },
        {
            name: "should strip fallback stopwords and descriptors",
            input: "Slices of Halloumi Cheese",
            expected: "halloumi cheese",
        },
        {
            name: "should strip fallback size and slice descriptors",
            input: "Large sliced onions",
            expected: "onions",
        },
        {
            name: "should preserve identity descriptors",
            input: "Fresh basil and ground almonds",
            expected: "fresh basil ground almonds",
        },
        {
            name: "should preserve packaged preparation descriptors",
            input: "1 can crushed tomatoes",
            expected: "1 can crushed tomatoes",
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
        expect(normalizeIngredientSearchText(input)).toBe(expected);
    });
});
