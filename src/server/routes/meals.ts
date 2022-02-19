import express, { Request, Response } from "express";
import db from "../../database";
import { v4 as uuidv4 } from "uuid";
import { Meal, Category, MealRating, Ingredient } from "../parameters";
import { LamingtonDataResponse, LamingtonResponse } from "../response";
import { lamington, meal, mealRating, mealCategory, mealRoster } from "../../database/definitions";
import { checkToken, verifyToken, AuthTokenData } from "../../authentication/auth";
import { addMealCategories, createFullMeal, createMeal, deleteMealCategories, getMeal, getMeals, rateMeal, updateMeal } from "../../database/actions/meals";

const router = express.Router();

interface GetMealParams {
    mealId: string;
    creatorId: string;
}

type GetMealRequest = Request<GetMealParams, LamingtonDataResponse<Meal>, AuthTokenData, null>;
type GetMealResponse = LamingtonDataResponse<Meal>;

/**
 * GET request to fetch a meal by Id
 * Requires meal query params
 * Does not require authentication (authentication is needed to fetch personal meal rating)
 */
router.get("/:mealId", checkToken, async (req: GetMealRequest, res: GetMealResponse) => {
    // Extract request fields
    const { mealId } = req.params;
    const { userId } = req.body;

    // Check all required fields are present
    if (!mealId) {
        return res.status(400).json({ error: true, message: `Error getting meal: Meal ID not provided.` });
    }

    // Fetch and return result
    try {
        const data = await getMeal(mealId, userId);
        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});

interface GetMealsParams {
    creatorId: string;
}

type GetMealsRequest = Request<GetMealsParams, LamingtonDataResponse<Meal[]>, AuthTokenData, null>;
type GetMealsResponse = LamingtonDataResponse<Meal[]>;

/**
 * GET request to fetch all meals
 * Does not require authentication (authentication is only needed to fetch personal meal rating)
 */
router.get("/", checkToken, async (req: GetMealsRequest, res: GetMealsResponse) => {
    // Extract request fields
    const { userId } = req.body;

    // Fetch and return result
    try {
        const data = await getMeals(userId);

        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});

interface RateMealBody extends AuthTokenData {
    mealId: string;
    rating: number;
}

type RateMealRequest = Request<null, null, RateMealBody, null>;
type RateMealResponse = LamingtonResponse;

/**
 * POST request to rate a meal
 * Requires meal rating body
 * Requires authentication body
 */
router.post("/rate", verifyToken, async (req: RateMealRequest, res: RateMealResponse) => {
    // Extract request fields
    const { userId, mealId, rating } = req.body;

    // Check all required fields are present
    if (!userId || !mealId || !rating) {
        return res.status(400).json({ error: true, message: `You haven't given enough information to rate this meal` });
    }

    // Create object
    const mealRating: MealRating = { mealId, raterId: userId, rating };

    // Update database and return status
    try {
        await rateMeal(mealRating);
        return res.status(201).json({ error: false, message: `yay! you've successfully rated this meal :)` });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Something went wrong rating this meal" + exception });
    }
});

interface DeleteMealBody extends AuthTokenData {
    mealId: string;
}

type DeleteMealRequest = Request<null, null, DeleteMealBody, null>;
type DeleteMealResponse = LamingtonResponse;

/**
 * POST request to delete a meal
 * Requires meal delete body
 * Requires authentication body
 */
router.post("/delete", verifyToken, async (req: DeleteMealRequest, res: DeleteMealResponse) => {
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
        const mealDetails: Meal = await db
            .from(lamington.meal)
            .select(meal.id, meal.createdBy)
            .where({ [meal.id]: mealId })
            .first();

        if (mealDetails.createdBy != userId) {
            return res.status(400).json({ error: true, message: `You are not authorised to delete this meal` });
        }

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
            .where({ [meal.id]: mealId })
            .del();
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this meal :)` });
    } catch (error) {
        return res.status(400).json({ error: true, message: error });
    }
});


interface CreateMealBody
    extends AuthTokenData,
        Partial<Omit<Meal, "ratingAverage" | "createdBy">> {
}

type CreateMealRequest = Request<null, null, CreateMealBody, null>;
type CreateMealResponse = LamingtonResponse;

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post("/", verifyToken, async (req: CreateMealRequest, res: CreateMealResponse) => {
    // Extract request fields
    const {
        // Meal
        id,
        name,
        source,
        notes,
        photo,
        servings,
        prepTime,
        cookTime,
        timesCooked,
        userId,

        // MealRating
        ratingPersonal,

        // MealIngredients
        ingredients = { data: {}, schema: 1 },

        // MealSteps
        method = { data: {}, schema: 1 },
    } = req.body;

    // Check all required fields are present
    if (!name) {
        return res.status(400).json({ error: true, message: `Error creating meal (No name provided)` });
    }

    try {
        let meal = {
            id,
            name,
            source,
            ingredients,
            method,
            notes,
            ratingPersonal,
            photo,
            servings,
            prepTime,
            cookTime,
            timesCooked,
            createdBy: userId,
        };

        if (id) {
            const existingMeal = await getMeal(id);
            if (!existingMeal) {
                await createFullMeal(meal, userId);
            }
            if (existingMeal.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    message: `Error editing meal (Cannot edit a meal that doesn't belong to you)`,
                });
            }

            // await updateFullMeal(meal);
        } else {
            await createFullMeal(meal, userId);
        }

        return res.status(201).json({ error: false, message: `yay! you've successfully created this meal :)` });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: `Error creating meal ${exception}` });
    }
});

export default router;
