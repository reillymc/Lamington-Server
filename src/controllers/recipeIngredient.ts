import db, {
    QueryService,
    Recipe,
    RecipeIngredient,
    SaveService,
    ingredient,
    lamington,
    recipe,
    recipeIngredient,
} from "../database";
import { EnsureArray, Undefined } from "../utils";

/**
 * Delete all RecipeIngredient rows for specified recipeId EXCEPT for the list of ingredient ids provided
 * @param recipeId recipe to run operation on
 * @param retainedIds ingredients to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedIds: string[]) =>
    db<RecipeIngredient>(lamington.recipeIngredient).where({ recipeId }).whereNotIn("id", retainedIds).delete();

/**
 * Create RecipeIngredients provided
 * @param recipeIngredients
 * @returns
 */
const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
    db<RecipeIngredient>(lamington.recipeIngredient).insert(recipeIngredients).onConflict(["id", "recipeId"]).merge();

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const save: SaveService<
    Pick<Recipe, "recipeId"> & { ingredients: Array<Omit<RecipeIngredient, "recipeId">> }
> = async params => {
    const recipeIngredients = EnsureArray(params);

    for (const { recipeId, ingredients } of recipeIngredients) {
        await deleteExcessRows(recipeId, ingredients.map(({ id }) => id).filter(Undefined));
    }

    const ingredients = recipeIngredients.flatMap(({ recipeId, ingredients }) =>
        ingredients.map((recipeIngredient): RecipeIngredient => ({ ...recipeIngredient, recipeId }))
    );

    if (ingredients.length > 0) await insertRows(ingredients);

    return [];
};

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredient
 */
const queryByRecipeId: QueryService<RecipeIngredient, Pick<Recipe, "recipeId">> = async ({ recipeId }) => {
    const data = await db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .select(
            recipeIngredient.id,
            recipeIngredient.ingredientId,
            recipeIngredient.subrecipeId,
            `${recipe.name} as recipeName`,
            `${ingredient.name} as ingredientName`,
            recipeIngredient.sectionId,
            recipeIngredient.index,
            recipeIngredient.description,
            recipeIngredient.unit,
            recipeIngredient.amount,
            recipeIngredient.multiplier
        )
        .leftJoin(lamington.ingredient, recipeIngredient.ingredientId, ingredient.ingredientId)
        .leftJoin(lamington.recipe, recipeIngredient.subrecipeId, recipe.recipeId);

    const result = data.map(({ recipeName, ingredientName, ...rest }) => ({
        ...rest,
        name: ingredientName ?? recipeName,
    }));

    return { result };
};

export type RecipeIngredientActions = typeof RecipeIngredientActions;

export const RecipeIngredientActions = {
    queryByRecipeId,
    save,
};
