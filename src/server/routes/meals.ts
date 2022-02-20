import express, { Request } from "express";
import db from "../../database";
import { LamingtonDataResponse, LamingtonResponse } from "../response";
import { lamington, meal, mealRating, mealCategory, mealRoster, MealRating as MealRatingRow } from "../../database/definitions";
import { checkToken, verifyToken, AuthTokenData } from "../../authentication/auth";
import MealActions, { getMeal, getMealCreator, getMeals } from "../../database/actions/meals";
import { InternalErrorResponse } from "./helper";
import { CreateMealBody, Meal } from "../specification";
import MealRatingActions from "../../database/actions/mealRating";

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

    console.log(mealId, userId)

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
            .where({ [meal.id]: mealId })
            .del();
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this meal :)` });
    } catch (error) {
        return res.status(400).json({ error: true, message: error });
    }
});


type CreateMealRequest = Request<null, null, CreateMealBody, null>;
type CreateMealResponse = LamingtonResponse;

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post("/", verifyToken, async ({ body }: CreateMealRequest, res: CreateMealResponse) => {
    // Check all required fields are present
    if (!body.format) {
        return res.status(400).json({ error: true, message: `No recipe format provided` });
    }

    if (body.format === 1){
        const meal: Meal = {
            id: body.id,
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
            if (!body.id) {
                await MealActions.insertMeal(meal, body.userId);
                return res.status(201).json({ error: false, message: `Recipe created` });
            } else {
                const existingMeal = await getMealCreator(body.id);
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
        } catch (exception: unknown) {
            return InternalErrorResponse(res, exception);
        }

    }

    return res.status(400).json({ error: true, message: `Recipe formatted incorrectly` });
});

export default router;


















// Move to ratings file? 
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
    const mealRating: MealRatingRow = { mealId, raterId: userId, rating };

    // Update database and return status
    try {
        await MealRatingActions.insertRows(mealRating);
        return res.status(201).json({ error: false, message: `yay! you've successfully rated this meal :)` });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Something went wrong rating this meal" + exception });
    }
});
