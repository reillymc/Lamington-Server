import { v4 as Uuid } from "uuid";

import { Undefined } from "../utils";

// DB Specs
import db, {
    Alias,
    lamington,
    recipe,
    Recipe,
    RecipeCategory,
    RecipeIngredient,
    recipeRating,
    RecipeRating,
    RecipeStep,
    ReadResponse,
    user,
} from "../database";

// DB Actions
import RecipeRatingActions from "./recipeRating";
import RecipeCategoryActions, { RecipeCategoryByRecipeIdResults } from "./recipeCategory";
import RecipeIngredientActions, { RecipeIngredientResults } from "./recipeIngredient";
import RecipeStepActions, { RecipeStepResults } from "./recipeStep";

// Server Request Specs
import { Recipe as CreateRecipeRequestItem } from "../routes/recipes";

// Server Response Specs
import { RecipeCategories, RecipeIngredients, RecipeMethod, Recipe as GetRecipeResponseItem } from "../spec/response";
import IngredientActions, { CreateIngredientParams } from "./ingredient";
import RecipeSectionActions, { RecipeSectionResults } from "./recipeSection";

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
                    .where({ [recipeAlias.recipeId]: db.raw(recipeRatingAlias.recipeId), [recipeRatingAlias.raterId]: userId })
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

const getRecipe = async (recipeId: string, userId: string) => {
    // Fetch from database
    const [recipe, categoryRows, ingredientRows, methodRows, sectionRows] = await Promise.all([
        getFullRecipe(recipeId, userId),
        RecipeCategoryActions.selectByRecipeId(recipeId),
        RecipeIngredientActions.selectByRecipeId(recipeId),
        RecipeStepActions.selectByRecipeId(recipeId),
        RecipeSectionActions.selectByRecipeId(recipeId),
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

const getRecipes = async (userId?: string) => {
    // Fetch from database
    const [recipeList, recipeCategoriesList] = await Promise.all([
        getAllRecipes(userId),
        RecipeCategoryActions.selectRows(),
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
 * @param userId
 */
const insertRecipe = async (recipeItem: CreateRecipeRequestItem, userId: string) => {
    const recipeId = recipeItem.recipeId ?? Uuid();

    const recipeData: Recipe = {
        recipeId: recipeId,
        name: recipeItem.name,
        createdBy: userId,
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
    if (ingredientRows) await IngredientActions.createIngredients(ingredientRows);

    // Update RecipeIngredients rows
    const recipeIngredientRows = recipeIngredientsRequestToRows(recipeId, recipeItem.ingredients);
    if (recipeIngredientRows) await RecipeIngredientActions.updateRows(recipeId, recipeIngredientRows);

    // Update RecipeSteps rows
    const recipeStepRows = recipeMethodRequestToRows(recipeId, recipeItem.method);
    if (recipeStepRows) await RecipeStepActions.updateRows(recipeId, recipeStepRows);

    // Update RecipeCategories rows
    const recipeCategoryRows = recipeCategoriesRequestToRows(recipeId, recipeItem.categories);
    await RecipeCategoryActions.updateRows(recipeId, recipeCategoryRows);

    // Update Recipe Rating row
    if (recipeItem.ratingPersonal) {
        const recipeRatingRow: RecipeRating = { recipeId, raterId: userId, rating: recipeItem.ratingPersonal };
        await RecipeRatingActions.insertRows(recipeRatingRow);
    }
};

const RecipeActions = {
    insertRecipe,
};

export default RecipeActions;

export { insertRecipe, getRecipe, getRecipes, getRecipeCreator };

// Helpers
const ingredientsRequestToRows = (ingredientSections?: RecipeIngredients): CreateIngredientParams[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections
        .flatMap(({ items }) => items)
        .filter(({ name }) => name !== undefined)
        .map(({ ingredientId, name }) => ({ id: ingredientId, name }));
};

const recipeIngredientsRequestToRows = (
    recipeId: string,
    ingredientSections?: RecipeIngredients
): RecipeIngredient[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId) return undefined;
                return {
                    id: ingItem.id,
                    recipeId,
                    ingredientId: ingItem.ingredientId,
                    subrecipeId: ingItem.subrecipeId,
                    sectionId,
                    index,
                    description: ingItem.description,
                    unit: ingItem.unit,
                    amount: ingItem.amount,
                    multiplier: ingItem.multiplier,
                };
            })
            .filter(Undefined)
    );
};

const recipeMethodRequestToRows = (recipeId: string, methodSections?: RecipeMethod): RecipeStep[] | undefined => {
    if (!methodSections?.length) return;

    return methodSections.flatMap(({ sectionId, items }) =>
        items.map((step, index): RecipeStep => {
            return {
                id: step.id,
                recipeId,
                stepId: step.stepId ?? Uuid(),
                sectionId,
                index,
                description: step.description,
                photo: undefined,
            };
        })
    );
};

const recipeCategoriesRequestToRows = (recipeId: string, categories: RecipeCategories = []): RecipeCategory[] =>
    categories.map(({ categoryId }) => ({
        recipeId,
        categoryId,
    }));

const recipeIngredientRowsToResponse = (
    ingredients: RecipeIngredientResults,
    sections: RecipeSectionResults
): RecipeIngredients => {
    const recipeIngredients: RecipeIngredients = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients.filter(ingredient => ingredient.sectionId === sectionId),
        }));

    return recipeIngredients;
};

const recipeStepRowsToResponse = (method: RecipeStepResults, sections: RecipeSectionResults): RecipeMethod => {
    const recipeMethod: RecipeMethod = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method.filter(method => method.sectionId === sectionId),
        }));

    return recipeMethod;
};

const recipeCategoryRowsToResponse = (categories: RecipeCategoryByRecipeIdResults): RecipeCategories => {
    const responseData: RecipeCategories = categories.map(catItem => ({
        categoryId: catItem.categoryId,
        name: catItem.name,
        type: catItem.type,
    }));
    return responseData;
};
