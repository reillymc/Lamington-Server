import db from "../database/db-config";
import {
    lamington,
    meals,
    users,
    mealRatings,
    categories,
    mealCategories,
    mealIngredients,
    ingredients,
    mealSteps,
} from "../database/definitions";
import { Meal, Category, MealRating, MealIngredientsResults, MealStepsResults } from "../interfaces/types";

const getAllMeals = async (): Promise<Meal[]> => {
    const query = db
        .from(lamington.meals)
        .select(meals.id, meals.name, meals.photo, meals.timesCooked, `${users.firstName} as createdBy`)
        .leftJoin(lamington.mealRatings, meals.id, mealRatings.mealId)
        .leftJoin(lamington.users, meals.createdBy, users.id)
        .groupBy(meals.id);

    return query;
};

const getFullMeal = async (mealId: string): Promise<Meal> => {
    const query = db<Meal>(lamington.meals)
        .select(
            meals.id,
            meals.name,
            meals.source,
            meals.ingredients,
            meals.method,
            meals.notes,
            meals.photo,
            `${users.firstName} as createdBy`,
            meals.timesCooked
        )
        .where({ [meals.id]: mealId } as any) //TODO remove any
        .select(db.raw(`COALESCE(ROUND(AVG(${mealRatings.rating}),1), 0) AS ratingAverage`))
        .leftJoin(lamington.mealRatings, meals.id, mealRatings.mealId)
        .leftJoin(lamington.users, meals.createdBy, users.id)
        .groupBy(meals.id)
        .first();

    return query;
};

const getMealCategories = async (mealId?: string): Promise<Category[]> => {
    const query = db<Category[]>(lamington.categories)
        .select(categories.id, categories.type, categories.name, categories.notes)
        .leftJoin(lamington.mealCategories, mealCategories.categoryId, categories.id);

    if (mealId) {
        query.where({ [mealCategories.mealId]: mealId });
    } else {
        query.select(mealCategories.mealId);
    }

    return query;
};

const getMealsRatings = async (): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRatings)
        .select(mealRatings.mealId, db.raw(`ROUND(AVG(${mealRatings.rating}),1) AS rating`))
        .groupBy(mealRatings.mealId);

    return query;
};

// fix any
const getMealRating = async (mealId?: string): Promise<any> => {
    const query = db<{ rating?: string }>(lamington.mealRatings)
        .select(db.raw(`ROUND(AVG(${mealRatings.rating}),1) AS rating`))
        .where({ [mealRatings.mealId]: mealId } as any)
        .first();

    return query;
};

const getMealsPersonalRatings = async (userId: string): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRatings)
        .where({ [mealRatings.raterId]: userId } as any)
        .select(mealRatings.mealId, mealRatings.rating)
        .groupBy(mealRatings.mealId);

    return query;
};

const getMealPersonalRating = async (mealId: string, userId: string): Promise<{ rating?: number }> => {
    const query = db<{ rating?: number }>(lamington.meals)
        .where({ [mealRatings.mealId]: mealId, [mealRatings.raterId]: userId } as any)
        .first(mealRatings.rating)
        .join(lamington.mealRatings, meals.id, mealRatings.mealId);

    return query;
};

const getMealIngredients = async (mealId: string): Promise<MealIngredientsResults[]> => {
    const query = db(lamington.mealIngredients)
        .where({ [mealIngredients.mealId]: mealId } as any)
        .select(
            mealIngredients.ingredientId,
            ingredients.name,
            mealIngredients.unit,
            mealIngredients.quantity,
            mealIngredients.section,
            mealIngredients.notes
        )
        .join(lamington.ingredients, mealIngredients.ingredientId, ingredients.id);

    return query;
};

const getMealSteps = async (mealId: string): Promise<MealStepsResults[]> => {
    const query = db(lamington.mealSteps)
        .where({ [mealSteps.mealId]: mealId } as any)
        .select(mealSteps.number, mealSteps.step, mealSteps.section, mealSteps.notes)
        .orderBy(mealSteps.number);

    return query;
};

const getMeal = async (mealId: string, userId?: string) => {
    // Fetch from database
    const [meal, categories, averageRating, personalRating, ingredients, method] = await Promise.all([
        getFullMeal(mealId),
        getMealCategories(mealId),
        getMealRating(mealId),
        userId ? getMealPersonalRating(mealId, userId) : { rating: 0 },
        getMealIngredients(mealId),
        getMealSteps(mealId),
    ]);

    // Process results
    const result: Meal = {
        ...meal,
        ratingPersonal: personalRating.rating,
        ratingAverage: parseFloat(averageRating.rating ?? "0"),
        categories: categories,
        ingredients: ingredients.length ? ingredients : meal.ingredients,
        method: method.length ? method : meal.method,
    };

    return result;
};

const getMeals = async (userId?: string) => {
    // Fetch from database
    const [mealList, categories, averageRatings, personalRatings] = await Promise.all([
        getAllMeals(),
        getMealCategories(),
        getMealsRatings(),
        userId ? getMealsPersonalRatings(userId) : [],
    ]);

    // Process results
    const data: Meal[] = mealList.map(meal => ({
        ...meal,
        ratingPersonal: userId ? personalRatings.find(rating => rating.mealId === meal.id)?.rating ?? 0 : undefined,
        ratingAverage: parseFloat(averageRatings.find(rating => rating.mealId === meal.id)?.rating.toString() ?? "0"),
        categories: categories
            .filter(category => category.mealId === meal.id)
            .map(category => ({ ...category, mealId: undefined })),
    }));
    return data;
};

export { getMeal, getMeals };
