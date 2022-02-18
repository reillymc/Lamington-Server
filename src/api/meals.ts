import db from "../database/db-config";
import {
    lamington,
    meal,
    users,
    mealRatings,
    category,
    mealCategories,
    mealIngredients,
    ingredient,
    mealSteps,
    Meal as MealTable,
    MealIngredientTable,
    MealStepsTable,
} from "../database/definitions";
import {
    Meal,
    Category,
    MealRating,
    MealIngredientsResults,
    MealStepsResults,
    MealIngredientItem,
    MealMethodStepItem,
    MealIngredients,
    MealMethod,
    Ingredient,
} from "../interfaces/types";
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
            meal.cost,
            meal.difficulty,
            `${users.firstName} as createdBy`
        )
        .leftJoin(lamington.mealRating, meal.id, mealRatings.mealId)
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
            meal.ingredients,
            meal.method,
            meal.notes,
            meal.photo,
            `${users.firstName} as createdBy`,
            meal.timesCooked
        )
        .where({ [meal.id]: mealId } as any) //TODO remove any
        .select(db.raw(`COALESCE(ROUND(AVG(${mealRatings.rating}),1), 0) AS ratingAverage`))
        .leftJoin(lamington.mealRating, meal.id, mealRatings.mealId)
        .leftJoin(lamington.user, meal.createdBy, users.id)
        .groupBy(meal.id)
        .first();

    return query;
};

const getMealCategories = async (mealId?: string): Promise<Category[]> => {
    const query = db<Category[]>(lamington.category)
        .select(category.id, category.type, category.name, category.notes)
        .leftJoin(lamington.mealCategory, mealCategories.categoryId, category.id);

    if (mealId) {
        query.where({ [mealCategories.mealId]: mealId });
    } else {
        query.select(mealCategories.mealId);
    }

    return query;
};

const getMealsRatings = async (): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRating)
        .select(mealRatings.mealId, db.raw(`ROUND(AVG(${mealRatings.rating}),1) AS rating`))
        .groupBy(mealRatings.mealId);

    return query;
};

// fix any
const getMealRating = async (mealId?: string): Promise<any> => {
    const query = db<{ rating?: string }>(lamington.mealRating)
        .select(db.raw(`ROUND(AVG(${mealRatings.rating}),1) AS rating`))
        .where({ [mealRatings.mealId]: mealId } as any)
        .first();

    return query;
};

const getMealsPersonalRatings = async (userId: string): Promise<MealRating[]> => {
    const query = db<MealRating[]>(lamington.mealRating)
        .where({ [mealRatings.raterId]: userId } as any)
        .select(mealRatings.mealId, mealRatings.rating)
        .groupBy(mealRatings.mealId);

    return query;
};

const getMealPersonalRating = async (mealId: string, userId: string): Promise<{ rating?: number }> => {
    const query = db<{ rating?: number }>(lamington.meal)
        .where({ [mealRatings.mealId]: mealId, [mealRatings.raterId]: userId } as any)
        .first(mealRatings.rating)
        .join(lamington.mealRating, meal.id, mealRatings.mealId);

    return query;
};

const getMealIngredients = async (mealId: string): Promise<MealIngredientsResults[]> => {
    const query = db(lamington.mealIngredient)
        .where({ [mealIngredients.mealId]: mealId } as any)
        .select(
            mealIngredients.ingredientId,
            ingredient.name,
        )
        .join(lamington.ingredient, mealIngredients.ingredientId, ingredient.id);

    return query;
};

const getMealSteps = async (mealId: string): Promise<MealStepsResults[]> => {
    const query = db(lamington.mealStep)
        .where({ [mealSteps.mealId]: mealId } as any)
        .select(mealSteps.mealId, mealSteps.stepId)

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
        ingredients: JSON.parse(meal.ingredients ?? "{}"),
        method: JSON.parse(meal.method ?? "{}"),
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
 * @param mealRating rating details of the meal and user
 * @returns
 */
const rateMeal = async (mealRating: MealRating) => {
    const result = await db(lamington.mealRating)
        .insert(mealRating)
        .onConflict([mealRatings.mealId, mealRatings.raterId])
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
        .onConflict([mealCategories.mealId, mealCategories.categoryId])
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
        .whereIn(mealCategories.categoryId, categoryIds)
        .andWhere({ [mealCategories.mealId]: mealId });

    return result;
};




const createFullMeal = async (meal: Omit<Meal, "id">, userId: string) => {
    const mealId = Uuid();

    // Create new Ingredients
    let finalMealIngredients: MealIngredientTable[] = [];
    if (meal.ingredients?.schema === 1 && meal.ingredients.data) {

        const finalIngredients: MealIngredients = { schema: 1, data: Object.fromEntries(Object.keys(meal.ingredients.data).map(sectionName => [sectionName, []])) };

        let newIngredients: MealIngredientItem[] = [];
        Object.entries(meal.ingredients.data).map(([sectionName, section]) =>
            section.map(ingredient => {
                if (!ingredient.id) {
                    const newIngredient: MealIngredientItem = { ...ingredient, id: Uuid() };
                    newIngredients.push(newIngredient);
                    finalIngredients.data[sectionName].push(newIngredient);
                } else {
                    finalIngredients.data[sectionName].push(ingredient); // May need to check if sectionName exists?
                }
            })
        );

        // TODO insert rows into mealIngredients
        // For updating mealIngredients on edit: delete * from MealIngredients where mealId and ingId not in newIngredients

        const newIngredientRows: Ingredient[] = newIngredients
            .map(ingredient =>
                ingredient.name ? { id: Uuid(), name: ingredient.name, namePlural: ingredient.namePlural, notes: ingredient.notes } : undefined
            )
            .filter(NotUndefined);

        finalMealIngredients = newIngredients
            .map(ingredient => (ingredient.id ? { id: Uuid(), mealId, ingredientId: ingredient.id } : undefined))
            .filter(NotUndefined); 

        const result = await db(lamington.ingredient)
        .insert(newIngredientRows)
        .onConflict([ingredient.id])
        .ignore();

        meal.ingredients.data = finalIngredients.data;
    }

    // Create new Method Steps
    let finalMealSteps: MealStepsTable[] = [];
    if (meal.method?.schema === 1 && meal.method.data) {
        const finalMethod: MealMethod = { schema: 1, data: Object.fromEntries(Object.keys(meal.method.data).map(sectionName => [sectionName, []])) };

        let newSteps: MealMethodStepItem[] = [];
        Object.entries(meal.method.data).map(([sectionName, section]) =>
            section.map(methodStep => {
                if (!methodStep.id) {
                    const newStep: MealMethodStepItem = { ...methodStep, id: Uuid() };
                    newSteps.push(newStep);
                    finalMethod.data[sectionName].push(newStep);
                }
                else {
                    finalMethod.data[sectionName].push(methodStep); // May need to check if sectionName exists?
                }
            })
        );

        finalMealSteps = newSteps.map(step => (step.id ? { mealId, stepId: step.id } : undefined)).filter(NotUndefined);        

        meal.method.data = finalMethod.data;
    }

    console.log(meal)
    createMeal({
        id: mealId,
        name: meal.name,
        createdBy: userId,
        cookTime: meal.cookTime,
        ingredients: JSON.stringify(meal.ingredients),
        method: JSON.stringify(meal.method),
        notes: meal.notes,
        photo: meal.photo,
        prepTime: meal.prepTime,
        servings: meal.servings,
        source: meal.source,
        timesCooked: meal.timesCooked,
        cost: meal.cost,
        difficulty: meal.difficulty,
    });

    // Create MealIngredients Rows
    await db(lamington.mealIngredient)
        .insert(finalMealIngredients)
        .onConflict([mealIngredients.id])
        .merge();

    // Create MealSteps Rows
    await db(lamington.mealStep)
        .insert(finalMealSteps)
        .onConflict([mealSteps.mealId, mealSteps.stepId])
        .merge();

    // Create MealCategories Data
    if (meal.categories?.schema === 1 && meal.categories.data) {
        const data = meal.categories.data.map(categoryId => ({ mealId, categoryId })); 
        await db(lamington.mealCategory)
            .insert(data)
            .onConflict([mealCategories.mealId, mealCategories.categoryId])
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