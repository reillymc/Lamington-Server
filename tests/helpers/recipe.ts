import { v4 as uuid } from "uuid";
import {
    RecipeIngredientItem,
    RecipeIngredients,
    RecipeMethod,
    RecipeMethodStep,
    RecipeTags,
} from "../../src/routes/spec";
import { randomNumber } from "./data";
import { Undefined } from "../../src/utils";
import { TagActions } from "../../src/controllers";
import { ServiceResponse } from "../../src/database";
import { RecipeService } from "../../src/controllers/spec/recipe";

export const generateRandomRecipeIngredientSections = (): ServiceResponse<RecipeService, "Save">["ingredients"] =>
    Array.from({ length: randomNumber() }).map(() => ({
        sectionId: uuid(),
        name: uuid(),
        description: uuid(),
        items: Array.from({ length: randomNumber() }).map(() => ({
            id: uuid(),
            name: uuid(),
            amount: JSON.stringify({ representation: "number", value: randomNumber() }),
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
                amount: { representation: "number", value: randomNumber() },
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
                photo: uuid(),
            })
        ),
    }));

export const createRandomRecipeTags = async (): Promise<RecipeTags> => {
    const tags: RecipeTags = Object.fromEntries(
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

export const assertRecipeTagsAreEqual = (tags1: RecipeTags = {}, tags2: RecipeTags = {}) => {
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
