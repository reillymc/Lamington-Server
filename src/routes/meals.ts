import express from "express";
import db from "../database";
import {
    lamington,
    meal,
    mealRating,
    mealCategory,
    mealRoster,
    MealRating as MealRatingRow,
} from "../database/definitions";
import MealActions, { getMeal, getMealCreator, getMeals } from "../controllers/meals";
import MealRatingActions from "../controllers/mealRating";
import { AuthenticatedBody } from "../middleware";
import { AppError, MessageAction, userMessage } from "../services";
import { ResponseBody } from "../spec";

const router = express.Router();

interface MealIngredientItem {
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

type MealIngredients = Array<Section<MealIngredientItem>>;

interface MealMethodStep {
    id: string;
    stepId?: string;
    description?: string;
}

type MealMethod = Array<Section<MealMethodStep>>;

interface MealCategoryItem {
    categoryId: string;
}

type MealCategories = Array<MealCategoryItem>;

export interface Meal {
    mealId?: string;
    name?: string;
    source?: string;
    ingredients?: MealIngredients;
    method?: MealMethod;
    notes?: string;
    photo?: string;
    ratingPersonal?: number;
    categories?: MealCategories;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

interface Meals {
    [mealId: string]: Meal;
}

interface MealRouteParams {
    mealId: string;
}

/**
 * GET request to fetch a meal by Id
 * Requires meal query params
 * Does not require authentication (authentication is needed to fetch personal meal rating)
 */
router.get<MealRouteParams, ResponseBody<Meal>, AuthenticatedBody>("/:mealId", async (req, res, next) => {
    // Extract request fields
    const { mealId } = req.params;
    const { userId } = req.body;

    console.log(mealId, userId);

    // Check all required fields are present
    if (!mealId) {
        return res.status(400).json({ error: true, message: `Error getting meal: Meal ID not provided.` });
    }

    // Fetch and return result
    try {
        const data = await getMeal(mealId, userId);
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "meal" }) }));
    }
});

/**
 * GET request to fetch all meals
 * Does not require authentication (authentication is only needed to fetch personal meal rating)
 */
router.get<never, ResponseBody<Meals>, AuthenticatedBody>("/", async (req, res, next) => {
    // Extract request fields
    const { userId } = req.body;

    // Fetch and return result
    try {
        const result = await getMeals(userId);
        const data = Object.fromEntries(result.map(row => [row.mealId, row]));
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "meals" }) }));
    }
});

interface DeleteMealBody {
    mealId: string;
}

/**
 * POST request to delete a meal
 * Requires meal delete body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<DeleteMealBody>>("/delete", async (req, res, next) => {
    // Extract request fields
    const { userId, mealId } = req.body;

    // Check all required fields are present
    if (!userId || !mealId) {
        return res
            .status(400)
            .json({ error: true, message: `You haven't given enough information to delete this meal` });
    }

    // Update database and return status
    try {
        // Check if the delete order came from the meal creator
        // const mealDetails: Meal = await db
        //     .from(lamington.meal)
        //     .select(meal.id, meal.createdBy)
        //     .where({ [meal.id]: mealId })
        //     .first();

        // if (mealDetails.createdBy != userId) {
        //     return res.status(400).json({ error: true, message: `You are not authorised to delete this meal` });
        // }

        //TODO: remove - should be handled with FK delete policy
        await db(lamington.mealRating)
            .where({ [mealRating.mealId]: mealId })
            .del();
        await db(lamington.mealRoster)
            .where({ [mealRoster.mealId]: mealId })
            .del();
        await db(lamington.mealCategory)
            .where({ [mealCategory.mealId]: mealId })
            .del();
        await db(lamington.meal)
            .where({ [meal.mealId]: mealId })
            .del();
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this meal :)` });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Delete, entity: "meal" }) }));
    }
});

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<Meal>>("/", async ({ body }, res, next) => {
    // Check all required fields are present
    const meal: Meal = {
        mealId: body.mealId,
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
        if (!body.mealId) {
            await MealActions.insertMeal(meal, body.userId);
            return res.status(201).json({ error: false, message: `Recipe created` });
        } else {
            const existingMeal = await getMealCreator(body.mealId);
            if (!existingMeal) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot find recipe to edit`,
                });
            }
            if (existingMeal.createdBy !== body.userId) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot edit a recipe that doesn't belong to you`,
                });
            }
            await MealActions.insertMeal(meal, body.userId);
            return res.status(201).json({ error: false, message: `Recipe updated` });
        }
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({
                    action: body.mealId ? MessageAction.Update : MessageAction.Read,
                    entity: "meal",
                }),
            })
        );
    }

    return res.status(400).json({ error: true, message: `Recipe formatted incorrectly` });
});

export default router;

// Move to ratings file?
interface RateMealBody extends MealRouteParams {
    rating: number;
}

/**
 * POST request to rate a meal
 * Requires meal rating body
 * Requires authentication body
 */
router.post<never, ResponseBody, AuthenticatedBody<RateMealBody>>("/rate", async (req, res, next) => {
    // Extract request fields
    const { userId, mealId, rating } = req.body;

    // Check all required fields are present
    if (!userId || !mealId || !rating) {
        return res.status(400).json({ error: true, message: `You haven't given enough information to rate this meal` });
    }

    // Create object
    const mealRating: MealRatingRow = { mealId, raterId: userId, rating };

    // Update database and return status
    try {
        await MealRatingActions.insertRows(mealRating);
        return res.status(201).json({ error: false, message: `yay! you've successfully rated this meal :)` });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: "rating", entity: "list" }) }));
    }
});
