import { v4 as Uuid } from "uuid";

import db, {
    Alias,
    lamington,
    recipe,
    Recipe,
    recipeRating,
    RecipeRating,
    ReadResponse,
    user,
    User,
} from "../database";

import { Recipe as GetRecipeResponseItem, PostRecipeRequest } from "../routes/spec";

import { IngredientActions } from "./ingredient";
import { RecipeIngredientActions } from "./recipeIngredient";
import { RecipeRatingActions } from "./recipeRating";
import { RecipeSectionActions } from "./recipeSection";
import { RecipeStepActions } from "./recipeStep";
import { RecipeTagActions } from "./recipeTag";

import {
    ingredientsRequestToRows,
    recipeIngredientRowsToResponse,
    recipeIngredientsRequestToRows,
    recipeMethodRequestToRows,
    recipeSectionRequestToRows,
    recipeStepRowsToResponse,
    recipeTagRowsToResponse,
    recipeTagsRequestToRows,
} from "./helpers";

type GetAllRecipesResults = Pick<
    Recipe,
    "recipeId" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "public" | "createdBy"
> & { ratingAverage: string; createdByName: User["firstName"] };

const getAllRecipes = async (userId: string): ReadResponse<GetAllRecipesResults> => {
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
            recipeAlias.public,
            recipeAlias.createdBy,
            `${user.firstName} as createdByName`,
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

const getMyRecipes = async (userId: string): ReadResponse<GetAllRecipesResults> => {
    const recipeAliasName = "m1";
    const recipeAlias = Alias(recipe, lamington.recipe, recipeAliasName);

    const recipeRatingAliasName = "mr1";
    const recipeRatingAlias = Alias(recipeRating, lamington.recipeRating, recipeRatingAliasName);

    const query = db
        .from(`${lamington.recipe} as ${recipeAliasName}`)
        .where({ [recipeAlias.createdBy]: userId })
        .select(
            recipeAlias.recipeId,
            recipeAlias.name,
            recipeAlias.photo,
            recipeAlias.timesCooked,
            recipeAlias.cookTime,
            recipeAlias.prepTime,
            recipeAlias.public,
            recipeAlias.createdBy,
            `${user.firstName} as createdByName`,
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

type GetFullRecipeResults = Recipe & { ratingAverage: string; createdByName: User["firstName"] }; // TODO: stop using Table suffix on types here

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
            recipe.public,
            recipe.timesCooked,
            recipe.createdBy,
            `${user.firstName} as createdByName`,
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

const readCreatedByUser = async (recipeId: string): Promise<{ createdBy: string } | undefined> => {
    const query = db(lamington.recipe)
        .select(recipe.createdBy)
        .where({ [recipe.recipeId]: recipeId })
        .first();

    return query;
};

const read = async (recipeId: string, userId: string) => {
    // Fetch from database
    const [recipe, tagRows, ingredientRows, methodRows, sectionRows] = await Promise.all([
        getFullRecipe(recipeId, userId),
        RecipeTagActions.readByRecipeId(recipeId),
        RecipeIngredientActions.readByRecipeId(recipeId),
        RecipeStepActions.readByRecipeId(recipeId),
        RecipeSectionActions.readByRecipeId(recipeId),
    ]);

    // Process results
    const ingredients = recipeIngredientRowsToResponse(ingredientRows, sectionRows);
    const method = recipeStepRowsToResponse(methodRows, sectionRows);
    const tags = recipeTagRowsToResponse(tagRows);

    const result: GetRecipeResponseItem = {
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        ingredients,
        method,
        tags,
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    };

    return result;
};

const readAll = async (userId: string) => {
    // Fetch from database
    const recipeList = await getAllRecipes(userId);
    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const data: GetRecipeResponseItem[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        tags: recipeTagRowsToResponse(
            recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
        ),
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    }));

    return data;
};

const readMy = async (userId: string) => {
    // Fetch from database
    const recipeList = await getMyRecipes(userId);
    const recipeCategoriesList = await RecipeTagActions.readByRecipeId(recipeList.map(({ recipeId }) => recipeId));

    // Process results
    const data: GetRecipeResponseItem[] = recipeList.map(recipe => ({
        // TODO: Update GetRecipeResponseItem naming
        ...recipe,
        ratingAverage: parseFloat(recipe.ratingAverage),
        tags: recipeTagRowsToResponse(
            recipeCategoriesList.filter(cat => !cat.parentId || cat.recipeId === recipe.recipeId)
        ),
        public: recipe.public === 1,
        createdBy: { userId: recipe.createdBy, firstName: recipe.createdByName },
    }));

    return data;
};

/**
 * Create a new recipe or update an existing recipe by recipeId
 * @param recipeItem
 */
const save = async (recipeItem: PostRecipeRequest) => {
    const recipeId = recipeItem.recipeId ?? Uuid();

    const recipeData: Recipe = {
        recipeId: recipeId,
        name: recipeItem.name,
        createdBy: recipeItem.userId,
        cookTime: recipeItem.cookTime,
        notes: recipeItem.notes,
        photo: recipeItem.photo,
        prepTime: recipeItem.prepTime,
        servings: recipeItem.servings,
        public: recipeItem.public ? 1 : 0,
        source: recipeItem.source,
        timesCooked: recipeItem.timesCooked,
    };

    await db(lamington.recipe).insert(recipeData).onConflict(recipe.recipeId).merge();

    // Create new RecipeSections rows
    const recipeSectionRows = recipeSectionRequestToRows(recipeId, recipeItem.ingredients, recipeItem.method);
    if (recipeSectionRows?.length) await RecipeSectionActions.save(recipeId, recipeSectionRows);

    // Create new Ingredients rows
    const ingredientRows = ingredientsRequestToRows(recipeItem.ingredients, recipeItem.userId);
    if (ingredientRows?.length) await IngredientActions.save(ingredientRows);

    // Update RecipeIngredients rows
    const recipeIngredientRows = recipeIngredientsRequestToRows(recipeId, recipeItem.ingredients);
    if (recipeIngredientRows?.length) await RecipeIngredientActions.save(recipeId, recipeIngredientRows);

    // Update RecipeSteps rows
    const recipeStepRows = recipeMethodRequestToRows(recipeId, recipeItem.method);
    if (recipeStepRows?.length) await RecipeStepActions.save(recipeId, recipeStepRows);

    // Update RecipeTags rows
    const recipeTagRows = recipeTagsRequestToRows(recipeId, recipeItem.tags);
    if (recipeTagRows?.length) await RecipeTagActions.save(recipeId, recipeTagRows);

    // Update Recipe Rating row
    if (recipeItem.ratingPersonal) {
        const recipeRatingRow: RecipeRating = {
            recipeId,
            raterId: recipeItem.userId,
            rating: recipeItem.ratingPersonal,
        };
        await RecipeRatingActions.save(recipeRatingRow);
    }
};

const deleteRecipe = async (recipeId: string) =>
    db(lamington.recipe)
        .where({ [recipe.recipeId]: recipeId })
        .del();

export const RecipeActions = {
    read,
    readAll,
    readMy,
    save,
    delete: deleteRecipe,
};

export const InternalRecipeActions = {
    readCreatedByUser,
};
