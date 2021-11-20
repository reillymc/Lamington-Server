import express, { Request, Response } from "express";
import db from "../database/db-config";
import { v4 as uuidv4 } from "uuid";
import { Meal, Category, MealRating } from "../interfaces/types";
import { LamingtonDataResponse, LamingtonResponse } from "../interfaces/response";
import { lamington, meals, mealRatings, mealCategories, mealRoster } from "../database/definitions";
import { checkToken, verifyToken, AuthTokenData } from "../authentication/auth";
import { getMeal, getMeals } from "../api/meals";

const router = express.Router();

interface GetMealParams {
    mealId: string;
    creatorId: string;
}

type GetMealRequest = Request<GetMealParams, LamingtonDataResponse<Meal>, AuthTokenData, null>;
type GetMealResponse = Response<LamingtonDataResponse<Meal>>;

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
type GetMealsResponse = Response<LamingtonDataResponse<Meal[]>>;

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
type RateMealResponse = Response<LamingtonResponse>;

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
    db(lamington.mealRatings)
        .insert(mealRating)
        .onConflict([mealRatings.mealId, mealRatings.raterId])
        .merge()
        .then(_ => {
            return res.status(201).json({ error: false, message: `yay! you've successfully rated this meal :)` });
        })
        .catch(error => {
            return res
                .status(400)
                .json({ error: true, message: "oops! It looks like something went wrong rating this meal :(" });
        });
});

interface DeleteMealBody extends AuthTokenData {
    mealId: string;
}

type DeleteMealRequest = Request<null, null, DeleteMealBody, null>;
type DeleteMealResponse = Response<LamingtonResponse>;

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
            .from(lamington.meals)
            .select(meals.id, meals.createdBy)
            .where({ [meals.id]: mealId })
            .first();

        if (mealDetails.createdBy != userId) {
            return res.status(400).json({ error: true, message: `You are not authorised to delete this meal` });
        }

        // should be handled with FK delete policy
        await db(lamington.mealRatings)
            .where({ [mealRatings.mealId]: mealId })
            .del();
        await db(lamington.mealRoster)
            .where({ [mealRoster.mealId]: mealId })
            .del();
        await db(lamington.mealCategories)
            .where({ [mealCategories.mealId]: mealId })
            .del();
        await db(lamington.meals)
            .where({ [meals.id]: mealId })
            .del();
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this meal :)` });
    } catch (error) {
        return res.status(400).json({ error: true, message: error });
    }
});

interface CreateMealBody extends AuthTokenData {
    id?: string;
    name: string;
    recipe?: string;
    ingredients?: string;
    method?: string;
    notes?: string;
    photo?: string;
    ratingPersonal?: number;
    categories?: Category[];
}

type CreateMealRequest = Request<null, null, CreateMealBody, null>;
type CreateMealResponse = Response<LamingtonResponse>;

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post("/", verifyToken, (req: CreateMealRequest, res: CreateMealResponse) => {
    // Extract request fields
    const {
        id,
        name,
        recipe = "",
        ingredients = "",
        method = "",
        notes = "",
        photo = "",
        ratingPersonal,
        categories = [],
        userId,
    } = req.body;

    // Check all required fields are present
    if (!name) {
        return res.status(400).json({ error: true, message: `Error creating meal (No name provided)` });
    }

    // Create object
    let meal: Meal = {
        id: id ?? "",
        name,
        recipe,
        ingredients,
        method,
        notes,
        photo,
        createdBy: userId,
    };

    // Update database and return status
    if (id) {
        db(lamington.meals)
            .update(meal)
            .where({ [meals.id]: id, [meals.createdBy]: userId })
            .then(async count => {
                if (count === 0) {
                    return res
                        .status(403)
                        .json({ error: true, message: "Cannot update a meal that does not belong to you! :( " });
                }
                if (ratingPersonal) {
                    const mealRating: MealRating = { mealId: id, raterId: userId, rating: ratingPersonal };
                    db(lamington.mealRatings)
                        .insert(mealRating)
                        .onConflict([mealRatings.mealId, mealRatings.rating])
                        .merge()
                        .catch(error => {
                            return res
                                .status(400)
                                .json({ error: true, message: "Meal Updated but unable to rate :( " });
                        });
                }
                if (categories.length > 0) {
                    await db(lamington.mealCategories)
                        .del()
                        .where({ [mealCategories.mealId]: meal.id });
                    categories.forEach(category => {
                        const mealCategory = {
                            [mealCategories.mealId]: meal.id,
                            [mealCategories.categoryId]: category.id,
                        };
                        db(lamington.mealCategories)
                            .insert(mealCategory)
                            .onConflict([mealRatings.mealId, mealRatings.rating])
                            .ignore()
                            .catch(error => {
                                return res
                                    .status(400)
                                    .json({ error: true, message: "Meal Created but unable to rate :( " });
                            });
                    });
                }
                return res.status(201).json({ error: false, message: `yay! you've successfully updated a meal :)` });
            })
            .catch(error => {
                return res.status(400).json({
                    error: true,
                    message: "oops! It looks like you are trying to update a meal that does not exist :( ",
                });
            });
    } else {
        meal.id = uuidv4();
        meal.timesCooked = 0;
        db(lamington.meals)
            .insert(meal)
            .onConflict([meals.id])
            .merge()
            .then(async _ => {
                if (categories.length > 0) {
                    await db(lamington.mealCategories)
                        .del()
                        .where({ [mealCategories.mealId]: meal.id });
                    categories.forEach(category => {
                        const mealCategory = {
                            [mealCategories.mealId]: meal.id,
                            [mealCategories.categoryId]: category.id,
                        };
                        db(lamington.mealCategories)
                            .insert(mealCategory)
                            .onConflict([mealRatings.mealId, mealRatings.rating])
                            .ignore()
                            .catch(error => {
                                return res
                                    .status(400)
                                    .json({ error: true, message: "Meal Created but unable to rate :( " });
                            });
                    });
                }
                return res.status(201).json({ error: false, message: `yay! you've successfully added a meal :)` });
            })
            .catch(error => {
                return res
                    .status(400)
                    .json({ error: true, message: "oops! It looks like something went wrong adding your meal :( " });
            });
    }
});

export default router;
