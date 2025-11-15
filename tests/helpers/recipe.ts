import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { TagActions } from "../../src/controllers/index.ts";
import { type ContentTags, type RecipeService } from "../../src/controllers/spec/recipe.ts";
import type { ServiceResponse } from "../../src/database/index.ts";
import type {
    RecipeIngredientItem,
    RecipeIngredients,
    RecipeMethod,
    RecipeMethodStep,
    RecipeServings,
} from "../../src/routes/spec/index.ts";
import { Undefined } from "../../src/utils/index.ts";
import { randomBoolean, randomNumber } from "./data.ts";
import { generateRandomAmount } from "./list.ts";

export const generateRandomRecipeIngredientSections = (): ServiceResponse<RecipeService, "Save">["ingredients"] =>
    Array.from({ length: randomNumber() }).map(() => ({
        sectionId: uuid(),
        name: uuid(),
        description: uuid(),
        items: Array.from({ length: randomNumber() }).map(() => ({
            id: uuid(),
            name: uuid(),
            amount: generateRandomAmount(),
            description: uuid(),
            multiplier: randomNumber(),
            unit: uuid(),
            ingredientId: uuid(),
        })),
    }));

export const generateRandomPostRecipeIngredientSections = (): RecipeIngredients =>
    Array.from({ length: randomNumber() }).map(() => ({
        sectionId: uuid(),
        name: uuid(),
        description: uuid(),
        items: Array.from({ length: randomNumber() }).map(
            (): RecipeIngredientItem => ({
                id: uuid(),
                name: uuid(),
                amount: generateRandomAmount(),
                description: uuid(),
                multiplier: randomNumber(),
                unit: uuid(),
                ingredientId: uuid(),
            })
        ),
    }));

export const generateRandomRecipeMethodSections = (): RecipeMethod =>
    Array.from({ length: randomNumber() }).map(() => ({
        sectionId: uuid(),
        name: uuid(),
        description: uuid(),
        items: Array.from({ length: randomNumber() }).map(
            (): RecipeMethodStep => ({
                id: uuid(),
                description: uuid(),
            })
        ),
    }));

export const generateRandomRecipeServings = (): RecipeServings => {
    if (randomBoolean()) {
        return {
            unit: uuid(),
            count: {
                representation: "number",
                value: randomNumber().toString(),
            },
        };
    }

    return {
        unit: uuid(),
        count: {
            representation: "range",
            value: [randomNumber().toString(), randomNumber().toString()],
        },
    };
};

export const createRandomRecipeTags = async (): Promise<ContentTags> => {
    const tags: ContentTags = Object.fromEntries(
        Array.from({ length: randomNumber() }).map(() => {
            const parentTagId = uuid();
            return [
                parentTagId,
                {
                    tagId: parentTagId,
                    name: uuid(),
                    description: uuid(),
                    tags: Array.from({ length: randomNumber() }).map(() => ({
                        tagId: uuid(),
                        name: uuid(),
                        description: uuid(),
                    })),
                },
            ];
        })
    );

    const parentTags = Object.values(tags).map(({ tags, ...tag }) => tag);

    const childTags = Object.values(tags)
        .flatMap(({ tags, tagId }) => tags?.map(tag => ({ ...tag, parentId: tagId })))
        .filter(Undefined);

    await TagActions.save(parentTags);
    await TagActions.save(childTags);

    return tags;
};

export const assertRecipeServingsAreEqual = (
    servings1: RecipeServings | string | undefined,
    servings2: RecipeServings | string | undefined
) => {
    if (!(servings1 && !!servings2) || (!servings2 && !!servings1)) throw new Error("Serving parameter undefined");
    const servings1Parsed = typeof servings1 === "string" ? JSON.parse(servings1) : servings1;
    const servings2Parsed = typeof servings2 === "string" ? JSON.parse(servings2) : servings2;

    expect(servings1Parsed.unit).toEqual(servings2Parsed.unit);
    expect(servings1Parsed.count.representation).toEqual(servings2Parsed.count.representation);
    expect(servings1Parsed.count.value).toEqual(servings2Parsed.count.value);
};

export const assertRecipeTagsAreEqual = (tags1: ContentTags = {}, tags2: ContentTags = {}) => {
    const tagGroups1 = Object.keys(tags1);
    const tagGroups2 = Object.keys(tags2);

    expect(tagGroups1.length).toEqual(tagGroups2.length);

    tagGroups1.forEach(tagGroup => {
        const tag1 = tags1[tagGroup];
        const tag2 = tags2[tagGroup];

        expect(tag1?.tagId).toEqual(tag2?.tagId);
        expect(tag1?.name).toEqual(tag2?.name);
        // expect(tag1?.description).toEqual(tag2?.description); Parent tag description currently not returned

        const childTags1 = tag1?.tags ?? [];
        const childTags2 = tag2?.tags ?? [];

        expect(childTags1.length).toEqual(childTags2.length);

        childTags1.forEach(childTag => {
            const childTag1 = childTags1.find(({ tagId }) => tagId === childTag.tagId);

            expect(childTag1).toBeDefined();
            expect(childTag1?.tagId).toEqual(childTag.tagId);
            expect(childTag1?.name).toEqual(childTag.name);
            expect(childTag1?.description).toEqual(childTag.description);
        });
    });
};
