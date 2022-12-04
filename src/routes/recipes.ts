import express from "express";
import db from "../database";
import {
    lamington,
    recipe,
    recipeRating,
    recipeCategory,
    recipeRoster,
    RecipeRating as RecipeRatingRow,
} from "../database/definitions";
import RecipeActions, { getRecipe, getRecipeCreator, getRecipes } from "../controllers/recipes";
import RecipeRatingActions from "../controllers/recipeRating";
import { AuthenticatedBody } from "../middleware";
import { AppError, MessageAction, userMessage } from "../services";
import { ResponseBody } from "../spec";

const router = express.Router();

interface RecipeIngredientItem {
    id: string;
    ingredientId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;

    // on create request only
    name?: string;
}
interface Section<T> {
    sectionId: string;
    name: string;
    description?: string;
    items: Array<T>;
}

type RecipeIngredients = Array<Section<RecipeIngredientItem>>;

interface RecipeMethodStep {
    id: string;
    stepId?: string;
    description?: string;
}

type RecipeMethod = Array<Section<RecipeMethodStep>>;

interface RecipeCategoryItem {
    categoryId: string;
}

type RecipeCategories = Array<RecipeCategoryItem>;

export interface Recipe {
    recipeId?: string;
    name?: string;
    source?: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
    notes?: string;
    photo?: string;
    ratingPersonal?: number;
    categories?: RecipeCategories;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

interface Recipes {
    [recipeId: string]: Recipe;
}

interface RecipeRouteParams {
    recipeId: string;
}

/**
 * GET request to fetch a recipe by Id
 * Requires recipe query params
 * Does not require authentication (authentication is needed to fetch personal recipe rating)
 */
router.get<RecipeRouteParams, ResponseBody<Recipe>, AuthenticatedBody>("/:recipeId", async (req, res, next) => {
    // Extract request fields
    const { recipeId } = req.params;
    const { userId } = req.body;

    // Check all required fields are present
    if (!recipeId) {
        return res.status(400).json({ error: true, message: `Error getting recipe: Recipe ID not provided.` });
    }

    // Fetch and return result
    try {
        const data = await getRecipe(recipeId, userId);
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipe" }) }));
    }
});

/**
 * GET request to fetch all recipes
 * Does not require authentication (authentication is only needed to fetch personal recipe rating)
 */
router.get<never, ResponseBody<Recipes>, AuthenticatedBody>("/", async (req, res, next) => {
    // Extract request fields
    const { userId } = req.body;

    // Fetch and return result
    try {
        const result = await getRecipes(userId);
        const data = Object.fromEntries(result.map(row => [row.recipeId, row]));
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipes" }) }));
    }
});

interface DeleteRecipeBody {
    recipeId: string;
}

/**
 * POST request to delete a recipe
 * Requires recipe delete body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<DeleteRecipeBody>>("/delete", async (req, res, next) => {
    // Extract request fields
    const { userId, recipeId } = req.body;

    // Check all required fields are present
    if (!userId || !recipeId) {
        return res
            .status(400)
            .json({ error: true, message: `You haven't given enough information to delete this recipe` });
    }

    // Update database and return status
    try {
        // Check if the delete order came from the recipe creator
        // const recipeDetails: Recipe = await db
        //     .from(lamington.recipe)
        //     .select(recipe.id, recipe.createdBy)
        //     .where({ [recipe.id]: recipeId })
        //     .first();

        // if (recipeDetails.createdBy != userId) {
        //     return res.status(400).json({ error: true, message: `You are not authorised to delete this recipe` });
        // }

        //TODO: remove - should be handled with FK delete policy
        await db(lamington.recipeRating)
            .where({ [recipeRating.recipeId]: recipeId })
            .del();
        await db(lamington.recipeRoster)
            .where({ [recipeRoster.recipeId]: recipeId })
            .del();
        await db(lamington.recipeCategory)
            .where({ [recipeCategory.recipeId]: recipeId })
            .del();
        await db(lamington.recipe)
            .where({ [recipe.recipeId]: recipeId })
            .del();
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this recipe :)` });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Delete, entity: "recipe" }) }));
    }
});

/**
 * POST request to create a new recipe or update an existing recipe
 * Requires recipe data body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<Recipe>>("/", async ({ body }, res, next) => {
    // Check all required fields are present
    const recipe: Recipe = {
        recipeId: body.recipeId,
        name: body.name,
        source: body.source,
        ingredients: body.ingredients,
        method: body.method,
        notes: body.notes,
        ratingPersonal: Math.min(Math.max(body.ratingPersonal ?? 0, 0), 5),
        photo: body.photo,
        servings: body.servings,
        prepTime: body.prepTime,
        cookTime: body.cookTime,
        timesCooked: body.timesCooked,
        categories: body.categories,
    };

    try {
        if (!body.recipeId) {
            await RecipeActions.insertRecipe(recipe, body.userId);
            return res.status(201).json({ error: false, message: `Recipe created` });
        } else {
            const existingRecipe = await getRecipeCreator(body.recipeId);
            if (!existingRecipe) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot find recipe to edit`,
                });
            }
            if (existingRecipe.createdBy !== body.userId) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot edit a recipe that doesn't belong to you`,
                });
            }
            await RecipeActions.insertRecipe(recipe, body.userId);
            return res.status(201).json({ error: false, message: `Recipe updated` });
        }
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({
                    action: body.recipeId ? MessageAction.Update : MessageAction.Read,
                    entity: "recipe",
                }),
            })
        );
    }

    return res.status(400).json({ error: true, message: `Recipe formatted incorrectly` });
});

export default router;

// Move to ratings file?
interface RateRecipeBody extends RecipeRouteParams {
    rating: number;
}

/**
 * POST request to rate a recipe
 * Requires recipe rating body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<RateRecipeBody>>("/rate", async (req, res, next) => {
    // Extract request fields
    const { userId, recipeId, rating } = req.body;

    // Check all required fields are present
    if (!userId || !recipeId || !rating) {
        return res
            .status(400)
            .json({ error: true, message: `You haven't given enough information to rate this recipe` });
    }

    // Create object
    const recipeRating: RecipeRatingRow = { recipeId, raterId: userId, rating };

    // Update database and return status
    try {
        await RecipeRatingActions.insertRows(recipeRating);
        return res.status(201).json({ error: false, message: `yay! you've successfully rated this recipe :)` });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: "rating", entity: "list" }) }));
    }
});
