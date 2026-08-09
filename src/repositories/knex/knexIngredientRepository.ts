import type {
    Ingredient,
    IngredientRepository,
} from "../ingredientRepository.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { createContentRows } from "./common/repositoryMethods/content.ts";
import type { ContentAuthorColumns } from "./common/rowTypes.ts";
import { knexRepository } from "./knexRepository.ts";
import { ContentTable, IngredientTable, lamington } from "./spec/index.ts";

type IngredientRow = Pick<Ingredient, "ingredientId" | "name"> & {
    namePlural: Ingredient["namePlural"] | null;
    description: Ingredient["description"] | null;
} & ContentAuthorColumns;

const formatIngredient = (
    ingredient: IngredientRow,
): Awaited<
    ReturnType<IngredientRepository["readAll"]>
>["ingredients"][number] => ({
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    namePlural: toUndefined(ingredient.namePlural),
    description: toUndefined(ingredient.description),
    owner: ingredient.createdBy
        ? {
              userId: ingredient.createdBy,
              firstName: ingredient.firstName,
          }
        : undefined,
});

export const createKnexIngredientRepository =
    knexRepository<IngredientRepository>({
        readAll: async (db, { userId }) => {
            const result: IngredientRow[] = await db(lamington.ingredient)
                .select(
                    IngredientTable.ingredientId,
                    IngredientTable.namePlural,
                    IngredientTable.name,
                    IngredientTable.description,
                )
                .leftJoin(
                    lamington.content,
                    IngredientTable.ingredientId,
                    ContentTable.contentId,
                )
                .where((builder) =>
                    userId !== undefined
                        ? builder.where({ [ContentTable.createdBy]: userId })
                        : builder.whereNull(ContentTable.createdBy),
                )
                .modify(withContentAuthor);

            return {
                userId,
                ingredients: result.map(formatIngredient),
            };
        },
        create: async (db, { ingredients, userId }) => {
            const newContent = await createContentRows(
                db,
                userId,
                ingredients.length,
            );

            const ingredientsToCreate = newContent.map(
                ({ contentId }, index) => ({
                    ...ingredients[index],
                    ingredientId: contentId,
                }),
            );

            const result = await db(lamington.ingredient)
                .insert(
                    ingredientsToCreate.map(
                        ({ name, ingredientId, description, namePlural }) => ({
                            name,
                            ingredientId,
                            description,
                            namePlural,
                        }),
                    ),
                )
                .returning([
                    IngredientTable.ingredientId,
                    IngredientTable.namePlural,
                    IngredientTable.name,
                    IngredientTable.description,
                ]);

            return {
                userId,
                ingredients: result.map(formatIngredient),
            };
        },
    });
