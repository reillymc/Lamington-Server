import db from "../config";
import {
    lamington,
    meal,
    users,
    mealRating,
    category,
    mealCategory,
    mealIngredient,
    ingredient,
    mealStep,
    Meal as MealTable,
    MealIngredient as MealIngredientRow,
    MealStep as MealStepRow,
    MealCategory as MealCategoryRow,
    MealRating as MealRatingRow,
    MealStepProperties,
    MealIngredientProperties,
} from "..";
import {
    Meal,
    Category,
    MealRating,
    MealStepsResults,
    MealIngredients,
} from "../../server/parameters";
import { v4 as Uuid } from "uuid";

const getAllMeals = async (): Promise<MealTable[]> => {
    const query = db
        .from(lamington.meal)
        .select(
            meal.id,
            meal.name,
            meal.photo,
            meal.timesCooked,
            meal.cookTime,
            meal.prepTime,
            `${users.firstName} as createdBy`,
        )
        .leftJoin(lamington.mealRating, meal.id, mealRating.mealId)
        .leftJoin(lamington.user, meal.createdBy, users.id)
        .groupBy(meal.id);

    return query;
};

const getFullMeal = async (mealId: string): Promise<MealTable> => {
    const query = db<Meal>(lamington.meal)
        .select(
            meal.id,
            meal.name,
            meal.source,
            meal.notes,
            meal.photo,
            `${users.firstName} as createdBy`,
            meal.timesCooked
        )
        .where({ [meal.id]: mealId } as any) //TODO remove any
        .select(db.raw(`COALESCE(ROUND(AVG(${mealRating.rating}),1), 0) AS ratingAverage`))
        .leftJoin(lamington.mealRating, meal.id, mealRating.mealId)
        .leftJoin(lamington.user, meal.createdBy, users.id)
        .groupBy(meal.id)
        .first();

    return query;
};

const getMealCategories = async (mealId?: string): Promise<Category[]> => {
    const query = db<Category[]>(lamington.category)
        .select(category.id, category.type, category.name, category.notes)
        .leftJoin(lamington.mealCategory, mealCategory.categoryId, category.id);

    if (mealId) {
        query.where({ [mealCategory.mealId]: mealId });
    } else {
        query.select(mealCategory.mealId);
    }

    return query;
};

const getMealsRatings = async (): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRating)
        .select(mealRating.mealId, db.raw(`ROUND(AVG(${mealRating.rating}),1) AS rating`))
        .groupBy(mealRating.mealId);

    return query;
};

// fix any
const getMealRating = async (mealId?: string): Promise<any> => {
    const query = db<{ rating?: string }>(lamington.mealRating)
        .select(db.raw(`ROUND(AVG(${mealRating.rating}),1) AS rating`))
        .where({ [mealRating.mealId]: mealId } as any)
        .first();

    return query;
};

const getMealsPersonalRatings = async (userId: string): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRating)
        .where({ [mealRating.raterId]: userId } as any)
        .select(mealRating.mealId, mealRating.rating)
        .groupBy(mealRating.mealId);

    return query;
};

const getMealPersonalRating = async (mealId: string, userId: string): Promise<{ rating?: number }> => {
    const query = db<{ rating?: number }>(lamington.meal)
        .where({ [mealRating.mealId]: mealId, [mealRating.raterId]: userId } as any)
        .first(mealRating.rating)
        .join(lamington.mealRating, meal.id, mealRating.mealId);

    return query;
};

export interface MealIngredientsResults {
    id: string;
    ingredientId: string;
    properties: string;
    name: string;
    namePlural: string;
    // unit: string; // enum of supported types?
    // quantity: number;
    // section?: string;
    // notes?: string;
}

const getMealIngredients = async (mealId: string): Promise<MealIngredientsResults[]> => {
    const query = db(lamington.mealIngredient)
        .where({ [mealIngredient.mealId]: mealId } as any)
        .select(
            mealIngredient.id,
            mealIngredient.ingredientId,
            mealIngredient.properties,
            ingredient.name,
            ingredient.namePlural,
        )
        .join(lamington.ingredient, mealIngredient.ingredientId, ingredient.id);

    return query;
};

const getMealSteps = async (mealId: string): Promise<MealStepsResults[]> => {
    const query = db(lamington.mealStep)
        .where({ [mealStep.mealId]: mealId } as any)
        .select(mealStep.mealId, mealStep.stepId)

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

    const ingdata: MealIngredients["data"] = {}
    // ingredients.map(ingredient => ingredient.)

    const IngredientData: MealIngredients = {schema: 1, data: {} }

    // Process results
    const result: Meal = {
        ...meal,
        ratingPersonal: personalRating.rating,
        ratingAverage: parseFloat(averageRating.rating ?? "0"),
        ingredients: 
        // categories: categories,
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
        name: meal.name ?? "Unnamed recipe",
        ingredients: undefined,
        method: undefined,
        ratingPersonal: userId ? personalRatings.find(rating => rating.mealId === meal.id)?.rating ?? 0 : undefined,
        ratingAverage: parseFloat(averageRatings.find(rating => rating.mealId === meal.id)?.rating.toString() ?? "0"),
        // categories: categories
        //     .filter(category => category.mealId === meal.id)
        //     .map(category => ({ ...category, mealId: undefined })),
    }));
    return data;
};

/**
 * Rate a meal
 * @param params rating details of the meal and user
 * @returns
 */
const rateMeal = async (params: MealRating) => {
    if (!params.raterId) return
    const rating: MealRatingRow = {mealId: params.mealId, raterId: params.raterId, rating: params.rating }
    const result = await db(lamington.mealRating)
        .insert(rating)
        .onConflict([mealRating.mealId, mealRating.raterId])
        .merge();

    return result;
};

/**
 * Update an existing meal with enw details
 * @param meal
 * @returns row count affected?
 */
const updateMeal = async (meal: MealTable) => {
    const result = await db(lamington.meal)
        .update(meal)
        .where({ [meal.id]: meal.id });

    return result;
};

/**
 * Create new meal
 * @param meal
 * @returns Id of created meal
 */
const createMeal = async (meal: MealTable) => {
    const mealId = meal.id ?? Uuid();
    const data: MealTable = { ...meal, id: mealId };

    const result = await db(lamington.meal).insert(data);

    return mealId;
};

/**
 * Add categories to list of meal categories
 * @param mealId to add categories to
 * @param categoryIds to add
 * @returns count of rows affected/categories added?
 */
const addMealCategories = async (mealId: string, categoryIds: string[]) => {
    const data = categoryIds.map(categoryId => ({ mealId, categoryId }));

    const result = await db(lamington.mealCategory)
        .insert(data)
        .onConflict([mealCategory.mealId, mealCategory.categoryId])
        .ignore();

    return result;
};

/**
 * Delete categories from list of meal categories
 * @param mealId to delete categories from
 * @param categoryIds to delete
 * @returns count of rows affected/categories deleted?
 */
const deleteMealCategories = async (mealId: string, categoryIds: string[]) => {
    const result = await db(lamington.mealCategory)
        .del()
        .whereIn(mealCategory.categoryId, categoryIds)
        .andWhere({ [mealCategory.mealId]: mealId });

    return result;
};


const createFullMeal = async (meal: Omit<Meal, "id">, userId: string) => {
    const mealId = Uuid();

    createMeal({
        id: mealId,
        name: meal.name,
        createdBy: userId,
        cookTime: meal.cookTime,
        notes: meal.notes,
        photo: meal.photo,
        prepTime: meal.prepTime,
        servings: meal.servings,
        source: meal.source,
        timesCooked: meal.timesCooked,
    });

    // Create MealIngredients rows
    const mealIngredientsRows: MealIngredientRow[] = [];
    if (meal.ingredients?.schema === 1 && meal.ingredients.data) {
        Object.entries(meal.ingredients.data).map(([sectionName, section]) =>
            section.map((ingredient, index) => {
                if (!ingredient.ingredientId) return;
                const properties: MealIngredientProperties = {
                    index,
                    section: sectionName,
                    unit: ingredient.unit,
                    amount: ingredient.amount,
                    multiplier: ingredient.multiplier,
                    notes: ingredient.notes,
                };
                mealIngredientsRows.push({
                    id: ingredient.id ?? Uuid(),
                    ingredientId: ingredient.ingredientId,
                    mealId,
                    properties: JSON.stringify(properties),
                });
            })
        );

        // For updating mealIngredients on edit: delete * from MealIngredients where mealId and ingId not in newIngredients
        // const result = await db(lamington.mealIngredient)
        // .delete()
        // .where(mealIngredient.mealId === mealId)

        const result = await db(lamington.mealIngredient)
            .insert(mealIngredientsRows)
            .onConflict([ingredient.id])
            .ignore();
    }

    // Create MealSteps rows
    const mealStepsRows: MealStepRow[] = [];
    if (meal.method?.schema === 1 && meal.method.data) {
        Object.entries(meal.method.data).map(([sectionName, section]) =>
            section.map((step, index) => {
                if (!step.id) return;
                const properties: MealStepProperties = {
                    index,
                    section: sectionName,
                    description: step.description,
                    notes: step.notes,
                };
                mealStepsRows.push({ mealId, stepId: step.id ?? Uuid(), properties: JSON.stringify(properties) });
            })
        );

        // For updating mealSteps on edit: delete * from MealSteps where mealId and ingId not in newSteps
        // const result = await db(lamington.mealStep)
        // .delete()
        // .where(mealStep.mealId === mealId)

        const result = await db(lamington.mealStep).insert(mealStepsRows).onConflict([mealStep.stepId]).ignore();
    }

    // Create MealCategories Data
    if (meal.categories?.schema === 1 && meal.categories.data) {
        const mealCategoriesRows: MealCategoryRow[] = meal.categories.data.map(categoryId => ({ mealId, categoryId }));

        // For updating mealCategories on edit: delete * from MealCategories where mealId and ingId not in newCategories
        // const result = await db(lamington.mealCategory)
        // .delete()
        // .where(mealCategory.mealId === mealId)

        await db(lamington.mealCategory)
            .insert(mealCategoriesRows)
            .onConflict([mealCategory.mealId, mealCategory.categoryId])
            .ignore();
    }

    // Create Meal Rating Data
    if (meal.ratingPersonal) {
        await rateMeal({ mealId, rating: meal.ratingPersonal, raterId: userId });
    }
};

// const updateFullMeal = (meal: Meal) => {
//     if (removedCategories.length > 0) {
//         await deleteMealCategories(id, removedCategories);
//     }

//     //delete all meal ingredients where mealId = mealId
//     // if ingredientItem has no id, create new ingredient
//     // add new mealIngredients
//     // assign new ingredients data from newly created row in db to ingredients object.

//     updateMeal(meal);
//     if (meal.ratingPersonal) {
//         await rateMeal({ mealId: id || createdId, rating: ratingPersonal, raterId: userId });
//     }
// };

export {
    addMealCategories,
    createFullMeal,
    createMeal,
    deleteMealCategories,
    getMeal,
    getMeals,
    rateMeal,
    // updateFullMeal,
    updateMeal,
};


const NotUndefined: <T>(x: T | undefined) => x is T = <T>(x: T | undefined): x is T => x !== undefined;