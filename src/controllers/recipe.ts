import { v4 as Uuid } from "uuid";

import db, { Alias, lamington, recipe, Recipe, recipeRating, RecipeRating, ReadResponse, user } from "../database";

import { Recipe as GetRecipeResponseItem, PostRecipeRequest } from "../routes/spec";

import { RecipeCategoryActions } from "./recipeCategory";
import { RecipeIngredientActions } from "./recipeIngredient";
import { RecipeRatingActions } from "./recipeRating";
import { RecipeSectionActions } from "./recipeSection";
import { RecipeStepActions } from "./recipeStep";
import { IngredientActions } from "./ingredient";

import {
    ingredientsRequestToRows,
    recipeCategoriesRequestToRows,
    recipeCategoryRowsToResponse,
    recipeIngredientRowsToResponse,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeStepRowsToResponse,
} from "./helpers";

type GetAllRecipesResults = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "createdBy"
> & { ratingAverage: string };

const getAllRecipes = async (userId?: string): ReadResponse<GetAllRecipesResults> => {
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const query = db
        .from(`${lamington.recipe} as ${recipeAliasName}`)
        .select(
            recipeAlias.recipeId,
            recipeAlias.name,
            recipeAlias.photo,
            recipeAlias.timesCooked,
            recipeAlias.cookTime,
            recipeAlias.prepTime,
            `${user.firstName} as createdBy`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(recipeRatingAlias.rating)
                    .from(`${lamington.recipeRating} as ${recipeRatingAliasName}`)
                    .where({
                        [recipeAlias.recipeId]: db.raw(recipeRatingAlias.recipeId),
                        [recipeRatingAlias.raterId]: userId,
                    })
                    .join(lamington.recipe, recipeAlias.recipeId, recipeRatingAlias.recipeId)
                    .groupBy(recipeAlias.recipeId)}) as ratingPersonal`
            )
        )
        .leftJoin(lamington.recipeRating, recipeAlias.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipeAlias.createdBy, user.userId)
        .groupBy(recipeAlias.recipeId);

    return query;
};

type GetFullRecipeResults = Recipe & { ratingAverage: string }; // TODO: stop using Table suffix on types here

const getFullRecipe = async (recipeId: string, userId: string): Promise<GetFullRecipeResults> => {
    const query = db<Recipe>(lamington.recipe)
        .select(
            recipe.recipeId,
            recipe.name,
            recipe.source,
            recipe.photo,
            recipe.servings,
            recipe.prepTime,
            recipe.cookTime,
            recipe.notes,
            recipe.timesCooked,
            `${user.firstName} as createdBy`,
            db.raw(`COALESCE(ROUND(AVG(${recipeRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(recipeRating.rating)
                    .from(lamington.recipeRating)
                    .where({ [recipeRating.recipeId]: recipeId, [recipeRating.raterId]: userId })}) as ratingPersonal`
            )
        )
        .where({ [recipe.recipeId]: recipeId })
        .leftJoin(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId)
        .leftJoin(lamington.user, recipe.createdBy, user.userId)
        .groupBy(recipe.recipeId)
        .first();

    return query;
};

const getRecipeCreator = async (recipeId: string): Promise<{ createdBy: string } | undefined> => {
    const query = db(lamington.recipe)
        .select(recipe.createdBy)
        .where({ [recipe.recipeId]: recipeId })
        .first();

    return query;
};

const readRecipes = async (recipeId: string, userId: string) => {
    // Fetch from database
    const [recipe, categoryRows, ingredientRows, methodRows, sectionRows] = await Promise.all([
        getFullRecipe(recipeId, userId),
        RecipeCategoryActions.readByRecipeId(recipeId),
        RecipeIngredientActions.readByRecipeId(recipeId),
        RecipeStepActions.readByRecipeId(recipeId),
        RecipeSectionActions.readByRecipeId(recipeId),
    ]);

    // TODO convert rows to recipe object: {[sectionId]: {name, description, index, ingredients: [], method: []}}
    const ingredients = recipeIngredientRowsToResponse(ingredientRows, sectionRows);
    const method = recipeStepRowsToResponse(methodRows, sectionRows);
    const categories = recipeCategoryRowsToResponse(categoryRows);

    // Process results
    const result: GetRecipeResponseItem = {
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        ingredients,
        method,
        categories,
    };

    return result;
};

const readMyRecipes = async (userId?: string) => {
    // Fetch from database
    const [recipeList, recipeCategoriesList] = await Promise.all([
        getAllRecipes(userId),
        RecipeCategoryActions.readAll(), // TODO revisit and handle in one SQL query
    ]);

    // Process results
    const data: GetRecipeResponseItem[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        categories: recipeCategoryRowsToResponse(recipeCategoriesList.filter(cat => cat.recipeId === recipe.recipeId)),
    }));

    return data;
};

/**
 * Create a new recipe or update an existing recipe by recipeId
 * @param recipeItem
 */
const insertRecipe = async (recipeItem: Omit<PostRecipeRequest, "userId">) => {
    const recipeId = recipeItem.recipeId ?? Uuid();

    const recipeData: Recipe = {
        recipeId: recipeId,
        name: recipeItem.name,
        createdBy: recipeItem.createdBy,
        cookTime: recipeItem.cookTime,
        notes: recipeItem.notes,
        photo: recipeItem.photo,
        prepTime: recipeItem.prepTime,
        servings: recipeItem.servings,
        source: recipeItem.source,
        timesCooked: recipeItem.timesCooked,
    };

    await db(lamington.recipe).insert(recipeData).onConflict(recipe.recipeId).merge();

    // Create new RecipeSections rows

    // Create new Ingredients rows
    const ingredientRows = ingredientsRequestToRows(recipeItem.ingredients);
    if (ingredientRows) await IngredientActions.save(ingredientRows);

    // Update RecipeIngredients rows
    const recipeIngredientRows = recipeIngredientsRequestToRows(recipeId, recipeItem.ingredients);
    if (recipeIngredientRows) await RecipeIngredientActions.save(recipeId, recipeIngredientRows);

    // Update RecipeSteps rows
    const recipeStepRows = recipeMethodRequestToRows(recipeId, recipeItem.method);
    if (recipeStepRows) await RecipeStepActions.save(recipeId, recipeStepRows);

    // Update RecipeCategories rows
    const recipeCategoryRows = recipeCategoriesRequestToRows(recipeId, recipeItem.categories);
    await RecipeCategoryActions.save(recipeId, recipeCategoryRows);

    // Update Recipe Rating row
    if (recipeItem.ratingPersonal) {
        const recipeRatingRow: RecipeRating = {
            recipeId,
            raterId: recipeItem.createdBy,
            rating: recipeItem.ratingPersonal,
        };
        await RecipeRatingActions.save(recipeRatingRow);
    }
};

export const RecipeActions = {
    read: readRecipes,
    readMy: readMyRecipes,
    save: insertRecipe,
};

export const InternalRecipeActions = {
    readCreatedByUser: getRecipeCreator,
};
