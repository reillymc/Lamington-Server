import express, { Request } from 'express';
import db from '../database/db-config';
import { v4 as uuidv4 } from 'uuid';
import { Meal, Category, MealRating, MealCategory } from '../database/types'
import { lamington_db, meals, meal_ratings, meal_categories, categories, users, meal_roster } from '../database/definitions'
import { checkToken, verifyToken, AuthenticatedBody } from '../authentication/auth';

const router = express.Router();

// Define Request Parameters
interface GetMealQuery {
    mealId: string;
    creatorId: string;
};

interface MealRatingBody {
    mealId: string,
    rating: number
}


/**
 * GET request to fetch all categories
 */
router.get('/categories', async (req, res) => {
    db.from(lamington_db.categories)
        .select(categories.id, categories.name)
        .then((categories: Category[]) => {
            res.status(200).json({ categories });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

/**
 * GET request to fetch the meal roster
 */
router.get('/roster', (req, res) => {
    db.from(lamington_db.meal_roster).select(meal_roster.mealId, meal_roster.assigneeId, meal_roster.assignmentDate, meal_roster.assignerId, meal_roster.cooked)
        .then((rows) => {
            res.status(200).json({ "years": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

/**
 * GET request to fetch a meal by Id
 * Requires meal query params
 * Does not require authentication (authentication is needed to fetch personal meal rating)
 */
router.get('/:mealId', checkToken, async (req: Request<GetMealQuery, {}, AuthenticatedBody, {}>, res) => {

    // Extract request fields
    const { mealId } = req.params;
    const { userId } = req.body;

    // Check all required fields are present
    if (!mealId) {
        res.status(400).json({ message: `Error getting meal` });
    }

    // Fetch and return data from database
    const mealDetails: Meal[] = await db.from(lamington_db.meals)
        .select(meals.id, meals.name, meals.recipe, meals.ingredients, meals.method, meals.notes, meals.photo, `${users.firstName} as createdBy`, meals.timesCooked)
        .where({ [meals.id]: mealId })
        .avg({ ratingAverage: meal_ratings.rating })
        .leftJoin(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .leftJoin(lamington_db.users, meals.createdBy, users.id)
        .groupBy(meals.id);

    const mealCategoryList: MealCategory[] = await db.from(lamington_db.categories)
        .select(categories.name)
        .leftJoin(lamington_db.meal_categories, meal_categories.categoryId, categories.id)
        .where({ [meal_categories.mealId]: mealId });

    const mealPersonalRating: { rating: number } | undefined = await db.from(lamington_db.meals)
        .where({ [meal_ratings.mealId]: mealId, [meal_ratings.raterId]: userId })
        .first(meal_ratings.rating)
        .join(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .catch(() => undefined)

    Promise.all([mealDetails, mealPersonalRating, mealCategoryList])
        .then(([mealDetailsResults, mealPersonalRatingResults, mealCategoryListResults]) => {
            const meal: Meal = {
                ...mealDetailsResults[0],
                ratingPersonal: mealPersonalRatingResults?.rating,
                categories: mealCategoryListResults.map(category => ({ id: category.mealId, name: category.name }))
            }
            res.status(200).json(meal);
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

/**
 * GET request to fetch all meals
 */
router.get('/', async (req, res) => {
    const mealList: Meal[] = await db.from(lamington_db.meals)
        .select(meals.id, meals.name, meals.photo, meals.timesCooked, `${users.firstName} as createdBy`)
        .avg({ ratingAverage: meal_ratings.rating })
        .leftJoin(lamington_db.meal_ratings, meals.id, meal_ratings.mealId)
        .leftJoin(lamington_db.users, meals.createdBy, users.id)
        .groupBy(meals.id);

    const mealCategoryList: MealCategory[] = await db.from(lamington_db.meal_categories)
        .select(meal_categories.mealId, categories.name)
        .leftJoin(lamington_db.categories, meal_categories.categoryId, categories.id)

    Promise.all([mealList, mealCategoryList])
        .then(([mealListResults, mealCategoryListResults]) => {
            const meals: Meal[] = mealListResults.map(meal => ({
                ...meal,
                categories: mealCategoryListResults.filter(category => category.mealId === meal.id).map(category => ({ id: category.mealId, name: category.name }))
            }))
            res.status(200).json({ meals })
        })
        .catch((err) => {
            res.json({ "Error": true, "Message": err });
        })
})

/**
 * POST request to create a new meal or update an existing meal
 * Requires meal data body
 * Requires authentication body
 */
router.post('/', verifyToken, (req: Request<{}, {}, Meal & AuthenticatedBody, {}>, res) => {

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
        timesCooked = 0,
        categories = [],
        userId
    } = req.body;

    // Check all required fields are present
    if (!name) {
        res.status(400).json({ message: `Error creating meal (No name provided)` });
    }

    // Create object
    let meal: Meal = {
        id,
        name,
        recipe,
        ingredients,
        method,
        notes,
        photo,
        createdBy: userId,
        timesCooked
    }

    // Update database and return status
    if (id) {
        db(lamington_db.meals)
            .update(meal)
            .where({ [meals.id]: id, [meals.createdBy]: userId })
            .then(count => {
                if (count === 0) {
                    res.status(403).json({ message: 'Cannot update a meal that does not belong to you! :( ' });
                }
                if (ratingPersonal) {
                    const mealRating: MealRating = { mealId: id, raterId: userId, rating: ratingPersonal, }
                    db(lamington_db.meal_ratings)
                        .insert(mealRating)
                        .onConflict([meal_ratings.mealId, meal_ratings.rating])
                        .merge()
                        .catch(error => {
                            res.status(400).json({ message: 'Meal Updated but unable to rate :( ' });
                        });
                }
                if (categories.length > 0) {
                    db(lamington_db.meal_categories)
                        .del()
                        .where({ [meal_categories.mealId]: meal.id })
                        .then(_ => {
                            categories.forEach(category => {
                                const mealCategory = { [meal_categories.mealId]: meal.id, [meal_categories.categoryId]: category.id }
                                db(lamington_db.meal_categories)
                                    .insert(mealCategory)
                                    .onConflict([meal_ratings.mealId, meal_ratings.rating])
                                    .merge()
                                    .catch(error => {
                                        res.status(400).json({ message: 'Meal Created but unable to rate :( ' });
                                    });
                            })
                        })
                }
                res.status(201).json({ message: `yay! you've successfully updated a meal :)` });
            })
            .catch(error => {
                res.status(400).json({ message: 'oops! It looks like you are trying to update a meal that does not exist :( ' });
            })
    } else {
        meal.id = uuidv4();
        db(lamington_db.meals)
            .insert(meal)
            .onConflict([meals.id])
            .merge()
            .then(_ => {
                if (categories.length > 0) {
                    db(lamington_db.meal_categories)
                        .del()
                        .where({ [meal_categories.mealId]: meal.id })
                        .then(_ => {
                            categories.forEach(category => {
                                const mealCategory = { [meal_categories.mealId]: meal.id, [meal_categories.categoryId]: category.id }
                                db(lamington_db.meal_categories)
                                    .insert(mealCategory)
                                    .onConflict([meal_ratings.mealId, meal_ratings.rating])
                                    .merge()
                                    .catch(error => {
                                        res.status(400).json({ message: 'Meal Created but unable to rate :( ' });
                                    });
                            })
                        })
                }
                if (categories.length > 0) {
                    categories.forEach(category => {
                        const mealCategory = { [meal_categories.mealId]: meal.id, [meal_categories.categoryId]: category.id }
                        db(lamington_db.meal_categories)
                            .insert(mealCategory)
                            .onConflict([meal_ratings.mealId, meal_ratings.rating])
                            .merge()
                            .catch(error => {
                                res.status(400).json({ message: 'Meal Created but unable to rate :( ' });
                            });
                    })
                }
                res.status(201).json({ message: `yay! you've successfully added a meal :)` });
            })
            .catch(error => {
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your meal :( ', error });
            })
    }
})

/**
 * POST request to rate a meal
 * Requires meal rating body
 * Requires authentication body
 */
router.post('/rate', verifyToken, async (req: Request<{}, {}, MealRatingBody & AuthenticatedBody, {}>, res) => {

    // Extract request fields
    const { userId, mealId, rating } = req.body;

    // Check all required fields are present
    if (!userId || !mealId || !rating) {
        res.status(400).json({ message: `You haven't given enough information to rate this meal` });
    }

    // Create object
    const mealRating: MealRating = { mealId, raterId: userId, rating, }

    // Update database and return status
    db(lamington_db.meal_ratings)
        .insert(mealRating)
        .onConflict([meal_ratings.mealId, meal_ratings.raterId])
        .merge()
        .then(_ => {
            res.status(201).json({ message: `yay! you've successfully rated this meal :)` });
        }).catch(error => {
            res.status(400).json({ message: 'oops! It looks like something went wrong rating this meal :(' });
        })
})

export default router