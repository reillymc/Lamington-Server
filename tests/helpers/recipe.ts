import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import type { components } from "../../src/routes/spec/schema.ts";
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
    (): components["schemas"]["RecipeIngredientSectionCreate"][] =>
        Array.from({ length: randomNumber() }).map(
            (): components["schemas"]["RecipeIngredientSectionCreate"] => ({
                name: uuid(),
                description: uuid(),
                items: Array.from({ length: randomNumber() }).map(
                    (): components["schemas"]["RecipeIngredientSectionCreate"]["items"][number] => ({
                        amount: generateRandomAmount(),
                        description: uuid(),
                        multiplier: randomNumber(),
                        unit: uuid(),
                        name: uuid(),
                        preparation: uuid(),
                    }),
                ),
            }),
        );

export const generateRandomRecipeMethodSections =
    (): components["schemas"]["RecipeMethodSection"][] =>
        Array.from({ length: randomNumber() }).map(() => ({
            name: uuid(),
            description: uuid(),
            items: Array.from({ length: randomNumber() }).map(() => ({
                content: uuid(),
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
    const parentTags = await KnexTagRepository.create(
        database,
        Array.from({ length: randomNumber() }).map(() => ({
            name: uuid(),
            description: uuid(),
        })),
    );

    const childTags = await KnexTagRepository.create(
        database,
        parentTags.flatMap(({ tagId }) =>
            Array.from({ length: randomNumber() }).map(() => ({
                parentId: tagId,
                name: uuid(),
                description: uuid(),
            })),
        ),
    );

    return childTags.map(({ tagId }) => ({ tagId }));
};
