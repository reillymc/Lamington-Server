import express, { Request, Response } from 'express';
import db from '../database/db-config';
import { v4 as uuidv4 } from 'uuid';
import { Meal, Category, MealRating, MealCategory, MealRoster } from '../interfaces/types'
import { LamingtonDataResponse, LamingtonResponse } from '../interfaces/response';
import { lamington_db, meals, meal_ratings, meal_categories, categories, users, meal_roster } from '../database/definitions'
import { checkToken, verifyToken, AuthTokenData } from '../authentication/auth';

const router = express.Router();

// Define Request Parameters, Queries and Bodies
interface GetMealParams {
    mealId: string,
    creatorId: string
};

interface RateMealBody extends AuthTokenData {
    mealId: string,
    rating: number
}

interface DeleteMealBody extends AuthTokenData {
    mealId: string
}

interface CreateMealBody extends AuthTokenData {
    id?: string,
    name: string,
    recipe?: string,
    ingredients?: string,
    method?: string,
    notes?: string,
    photo?: string,
    ratingPersonal?: number,
    categories?: Category[]
}


/**
 * GET request to fetch all categories
 */
router.get('/categories', async (req, res: Response<LamingtonDataResponse<Category[]>>) => {
    db.from(lamington_db.categories)
        .select(categories.id, categories.name)
        .then((categories: Category[]) => {
            return res.status(200).json({ error: false, data: categories });
        })
        .catch((err) => {
            console.log(err);
            return res.json({ error: true, message: err });
        })
})

/**
 * GET request to fetch the meal roster
 */
router.get('/roster', (req, res: Response<LamingtonDataResponse<MealRoster>>) => {
    db.from(lamington_db.meal_roster).select(meal_roster.mealId, meal_roster.assigneeId, meal_roster.assignmentDate, meal_roster.assignerId, meal_roster.cooked)
        .then((rows) => {
            return res.status(200).json({ error: false, data: rows });
        })
        .catch((err) => {
            console.log(err);
            return res.json({ error: true, message: err });
        })
})

/**
 * GET request to fetch a meal by Id
 * Requires meal query params
 * Does not require authentication (authentication is needed to fetch personal meal rating)
 */
router.get('/:mealId', checkToken, async (req: Request<GetMealParams, LamingtonDataResponse<Meal>, AuthTokenData, null>, res: Response<LamingtonDataResponse<Meal>>) => {

    // Extract request fields
    const { mealId } = req.params;
    const { userId } = req.body;

    // Check all required fields are present
    if (!mealId) {
        return res.status(400).json({ error: true, message: `Error getting meal` });
    }

    // Fetch and return data from database
    const mealDetails: Meal[] = await db.from(lamington_db.meals)
        .select(meals.id, meals.name, meals.recipe, meals.ingredients, meals.method, meals.notes, meals.photo, `${users.firstName} as createdBy`, meals.timesCooked)
        .where({ [meals.id]: mealId })
        .avg({ ratingAverage: meal_ratings.rating })
        .leftJoin(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .leftJoin(lamington_db.users, meals.createdBy, users.id)
        .groupBy(meals.id);

    const mealCategoryList: Category[] = await db.from(lamington_db.categories)
        .select(categories.id, categories.name)
        .leftJoin(lamington_db.meal_categories, meal_categories.categoryId, categories.id)
        .where({ [meal_categories.mealId]: mealId });

    const mealPersonalRating: { rating: number } | undefined = await db.from(lamington_db.meals)
        .where({ [meal_ratings.mealId]: mealId, [meal_ratings.raterId]: userId })
        .first(meal_ratings.rating)
        .join(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .catch(() => undefined)

    const data: Meal = {
        ...mealDetails[0],
        ratingPersonal: mealPersonalRating?.rating,
        categories: mealCategoryList
    }
    return res.status(200).json({ error: false, data });

})

/**
 * GET request to fetch all meals
 */
router.get('/', async (req: Request, res: Response<LamingtonDataResponse<Meal[]>>) => {
    const mealList: Meal[] = await db.from(lamington_db.meals)
        .select(meals.id, meals.name, meals.photo, meals.timesCooked, `${users.firstName} as createdBy`)
        .avg({ ratingAverage: meal_ratings.rating })
        .leftJoin(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .leftJoin(lamington_db.users, meals.createdBy, users.id)
        .groupBy(meals.id);

    const mealCategoryList: MealCategory[] = await db.from(lamington_db.meal_categories)
        .select(meal_categories.mealId, meal_categories.categoryId, categories.name)
        .leftJoin(lamington_db.categories, meal_categories.categoryId, categories.id)

    const data: Meal[] = mealList.map(meal => ({
        ...meal,
        categories: mealCategoryList.filter(category => category.mealId === meal.id).map(category => ({ id: category.categoryId, name: category.name }))
    }))
    return res.status(200).json({ error: false, data })
})

/**
 * POST request to rate a meal
 * Requires meal rating body
 * Requires authentication body
 */
router.post('/rate', verifyToken, async (req: Request<null, null, RateMealBody, null>, res: Response<LamingtonResponse>) => {

    // Extract request fields
    const { userId, mealId, rating } = req.body;

    // Check all required fields are present
    if (!userId || !mealId || !rating) {
        return res.status(400).json({ error: true, message: `You haven't given enough information to rate this meal` });
    }

    // Create object
    const mealRating: MealRating = { mealId, raterId: userId, rating, }

    // Update database and return status
    db(lamington_db.meal_ratings)
        .insert(mealRating)
        .onConflict([meal_ratings.mealId, meal_ratings.raterId])
        .merge()
        .then(_ => {
            return res.status(201).json({ error: false, message: `yay! you've successfully rated this meal :)` });
        }).catch(error => {
            return res.status(400).json({ error: true, message: 'oops! It looks like something went wrong rating this meal :(' });
        })
})

/**
 * POST request to rate a meal
 * Requires meal rating body
 * Requires authentication body
 */
router.post('/delete', verifyToken, async (req: Request<null, null, DeleteMealBody, null>, res: Response<LamingtonResponse>) => {

    // Extract request fields
    const { userId, mealId } = req.body;

    // Check all required fields are present
    if (!userId || !mealId) {
        return res.status(400).json({ error: true, message: `You haven't given enough information to delete this meal` });
    }

    // Update database and return status
    try {
        // Check if the delete order came from the meal creator
        const mealDetails: Meal = await db.from(lamington_db.meals)
            .select(meals.id, meals.createdBy)
            .where({ [meals.id]: mealId })
            .first()

        if (mealDetails.createdBy != userId) {
            return res.status(400).json({ error: true, message: `You are not authorised to delete this meal` });
        }

        await db(lamington_db.meal_ratings)
            .where({ [meal_ratings.mealId]: mealId })
            .del()
        await db(lamington_db.meal_roster)
            .where({ [meal_roster.mealId]: mealId })
            .del()
        await db(lamington_db.meal_categories)
            .where({ [meal_categories.mealId]: mealId })
            .del()
        await db(lamington_db.meals)
            .where({ [meals.id]: mealId })
            .del()
        return res.status(201).json({ error: false, message: `yay! you've successfully deleted this meal :)` });
    } catch (error) {
        return res.status(400).json({ error: true, message: error });
    }
})

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post('/', verifyToken, (req: Request<null, null, CreateMealBody, null>, res: Response<LamingtonResponse>) => {

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
        userId
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
    }

    // Update database and return status
    if (id) {
        db(lamington_db.meals)
            .update(meal)
            .where({ [meals.id]: id, [meals.createdBy]: userId })
            .then(async count => {
                if (count === 0) {
                    return res.status(403).json({ error: true, message: 'Cannot update a meal that does not belong to you! :( ' });
                }
                if (ratingPersonal) {
                    const mealRating: MealRating = { mealId: id, raterId: userId, rating: ratingPersonal, }
                    db(lamington_db.meal_ratings)
                        .insert(mealRating)
                        .onConflict([meal_ratings.mealId, meal_ratings.rating])
                        .merge()
                        .catch(error => {
                            return res.status(400).json({ error: true, message: 'Meal Updated but unable to rate :( ' });
                        });
                }
                if (categories.length > 0) {
                    await db(lamington_db.meal_categories)
                        .del()
                        .where({ [meal_categories.mealId]: meal.id })
                    categories.forEach(category => {
                        const mealCategory = { [meal_categories.mealId]: meal.id, [meal_categories.categoryId]: category.id }
                        db(lamington_db.meal_categories)
                            .insert(mealCategory)
                            .onConflict([meal_ratings.mealId, meal_ratings.rating])
                            .ignore()
                            .catch(error => {
                                return res.status(400).json({ error: true, message: 'Meal Created but unable to rate :( ' });
                            });
                    })
                }
                return res.status(201).json({ error: false, message: `yay! you've successfully updated a meal :)` });
            })
            .catch(error => {
                return res.status(400).json({ error: true, message: 'oops! It looks like you are trying to update a meal that does not exist :( ' });
            })
    } else {
        meal.id = uuidv4()
        meal.timesCooked = 0;
        db(lamington_db.meals)
            .insert(meal)
            .onConflict([meals.id])
            .merge()
            .then(async _ => {
                if (categories.length > 0) {
                    await db(lamington_db.meal_categories)
                        .del()
                        .where({ [meal_categories.mealId]: meal.id })
                    categories.forEach(category => {
                        const mealCategory = { [meal_categories.mealId]: meal.id, [meal_categories.categoryId]: category.id }
                        db(lamington_db.meal_categories)
                            .insert(mealCategory)
                            .onConflict([meal_ratings.mealId, meal_ratings.rating])
                            .ignore()
                            .catch(error => {
                                return res.status(400).json({ error: true, message: 'Meal Created but unable to rate :( ' });
                            });
                    })
                }
                return res.status(201).json({ error: false, message: `yay! you've successfully added a meal :)` });
            })
            .catch(error => {
                return res.status(400).json({ error: true, message: 'oops! It looks like something went wrong adding your meal :( ' });
            })
    }
})

export default router