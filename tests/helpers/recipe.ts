import { expect } from "expect";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import type { components } from "../../src/routes/spec/schema.ts";
import { Undefined } from "../../src/utils/index.ts";
import { randomBoolean, randomNumber } from "./data.ts";

const generateRandomAmount = [
    () =>
        ({
            representation: "number",
            value: randomNumber(1, 100).toString(),
        }) satisfies components["schemas"]["ItemAmount"],
    () =>
        ({
            representation: "range",
            value: [
                randomNumber(1, 100).toString(),
                randomNumber(1, 100).toString(),
            ],
        }) satisfies components["schemas"]["ItemAmount"],
    () =>
        ({
            representation: "fraction",
            value: [
                randomNumber(1, 100).toString(),
                randomNumber(1, 100).toString(),
                randomNumber(1, 100).toString(),
            ],
        }) satisfies components["schemas"]["ItemAmount"],
][randomNumber(0, 2)]!;

export const generateRandomRecipeIngredientSections =
    (): components["schemas"]["RecipeSectionIngredient"][] =>
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
                // ingredientId: uuid(), TODO: verify or remove ingredient creation support entirely
            })),
        }));

export const generateRandomRecipeMethodSections =
    (): components["schemas"]["RecipeSectionMethod"][] =>
        Array.from({ length: randomNumber() }).map(() => ({
            sectionId: uuid(),
            name: uuid(),
            description: uuid(),
            items: Array.from({ length: randomNumber() }).map(() => ({
                id: uuid(),
                description: uuid(),
            })),
        }));

export const generateRandomRecipeServings =
    (): components["schemas"]["Servings"] => {
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

export const createRandomRecipeTags = async (database: KnexDatabase) => {
    const tags = Object.fromEntries(
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
        }),
    );

    const parentTags = Object.values(tags).map(({ tags, ...tag }) => tag);

    const childTags = Object.values(tags)
        .flatMap(({ tags, tagId }) =>
            tags?.map((tag) => ({ ...tag, parentId: tagId })),
        )
        .filter(Undefined);

    await KnexTagRepository.create(database, parentTags);
    await KnexTagRepository.create(database, childTags);

    return childTags;
};

export const assertRecipeServingsAreEqual = (
    servings1: components["schemas"]["Servings"] | string | undefined,
    servings2: components["schemas"]["Servings"] | string | undefined,
) => {
    if (!(servings1 && !!servings2) || (!servings2 && !!servings1))
        throw new Error("Serving parameter undefined");
    const servings1Parsed =
        typeof servings1 === "string" ? JSON.parse(servings1) : servings1;
    const servings2Parsed =
        typeof servings2 === "string" ? JSON.parse(servings2) : servings2;

    expect(servings1Parsed.unit).toEqual(servings2Parsed.unit);
    expect(servings1Parsed.count.representation).toEqual(
        servings2Parsed.count.representation,
    );
    expect(servings1Parsed.count.value).toEqual(servings2Parsed.count.value);
};

export const assertRecipeTagsAreEqual = (tags1: any = {}, tags2: any = {}) => {
    const tagGroups1 = Object.keys(tags1);
    const tagGroups2 = Object.keys(tags2);

    expect(tagGroups1.length).toEqual(tagGroups2.length);

    tagGroups1.forEach((tagGroup) => {
        const tag1 = tags1[tagGroup];
        const tag2 = tags2[tagGroup];

        expect(tag1?.tagId).toEqual(tag2?.tagId);
        expect(tag1?.name).toEqual(tag2?.name);
        // expect(tag1?.description).toEqual(tag2?.description); Parent tag description currently not returned

        const childTags1 = tag1?.tags ?? [];
        const childTags2 = tag2?.tags ?? [];

        expect(childTags1.length).toEqual(childTags2.length);

        childTags1.forEach((childTag: any) => {
            const childTag1 = childTags1.find(
                ({ tagId }: any) => tagId === childTag.tagId,
            );

            expect(childTag1).toBeDefined();
            expect(childTag1?.tagId).toEqual(childTag.tagId);
            expect(childTag1?.name).toEqual(childTag.name);
            expect(childTag1?.description).toEqual(childTag.description);
        });
    });
};
