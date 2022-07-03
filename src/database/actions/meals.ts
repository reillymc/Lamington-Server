import { v4 as Uuid } from "uuid";

import { Alias, ObjectFromEntries, Undefined } from "../helpers";

// DB Specs
import db from "../config";
import {
    lamington,
    meal,
    Meal,
    MealCategory,
    MealIngredient,
    mealRating,
    MealRating,
    MealStep,
    ReadResponse,
    users,
} from "..";

// DB Actions
import MealRatingActions from "./mealRating";
import MealCategoryActions, { MealCategoryByMealIdResults } from "./mealCategory";
import MealIngredientActions, { MealIngredientResults } from "./mealIngredient";
import MealStepActions, { MealStepResults } from "./mealStep";

// Server Request Specs
import { Meal as CreateMealRequestItem } from "../../server/specification";

// Server Response Specs
import { MealCategories, MealIngredients, MealMethod, Meal as GetMealResponseItem } from "../../server/response";
import IngredientActions, { CreateIngredientParams } from "./ingredient";

type GetAllMealsResults = Pick<
    Meal,
    "id" | "name" | "photo" | "timesCooked" | "cookTime" | "prepTime" | "createdBy"
> & { ratingAverage: string };

const getAllMeals = async (userId?: string): ReadResponse<GetAllMealsResults> => {
    const mealAliasName = "m1";
    const mealAlias = Alias(meal, lamington.meal, mealAliasName);

    const mealRatingAliasName = "mr1";
    const mealRatingAlias = Alias(mealRating, lamington.mealRating, mealRatingAliasName);

    const query = db
        .from(`${lamington.meal} as ${mealAliasName}`)
        .select(
            mealAlias.id,
            mealAlias.name,
            mealAlias.photo,
            mealAlias.timesCooked,
            mealAlias.cookTime,
            mealAlias.prepTime,
            `${users.firstName} as createdBy`,
            db.raw(`COALESCE(ROUND(AVG(${mealRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(mealRatingAlias.rating)
                    .from(`${lamington.mealRating} as ${mealRatingAliasName}`)
                    .where({ [mealAlias.id]: db.raw(mealRatingAlias.mealId), [mealRatingAlias.raterId]: userId })
                    .join(lamington.meal, mealAlias.id, mealRatingAlias.mealId)
                    .groupBy(mealAlias.id)}) as ratingPersonal`
            )
        )
        .leftJoin(lamington.mealRating, mealAlias.id, mealRating.mealId)
        .leftJoin(lamington.user, mealAlias.createdBy, users.id)
        .groupBy(mealAlias.id);

    return query;
};

type GetFullMealResults = Meal & { ratingAverage: string }; // TODO: stop using Table suffix on types here

const getFullMeal = async (mealId: string, userId?: string): Promise<GetFullMealResults> => {
    const query = db<Meal>(lamington.meal)
        .select(
            meal.id,
            meal.name,
            meal.source,
            meal.photo,
            meal.servings,
            meal.prepTime,
            meal.cookTime,
            meal.notes,
            meal.timesCooked,
            `${users.firstName} as createdBy`,
            db.raw(`COALESCE(ROUND(AVG(${mealRating.rating}),1), 0) AS ratingAverage`),
            db.raw(
                `(${db
                    .select(mealRating.rating)
                    .from(lamington.mealRating)
                    .where({ [mealRating.mealId]: mealId, [mealRating.raterId]: userId })}) as ratingPersonal`
            )
        )
        .where({ [meal.id]: mealId })
        .leftJoin(lamington.mealRating, meal.id, mealRating.mealId)
        .leftJoin(lamington.user, meal.createdBy, users.id)
        .groupBy(meal.id)
        .first();

    return query;
};

const getMealCreator = async (mealId: string): Promise<{ createdBy: string } | undefined> => {
    const query = db(lamington.meal)
        .select(meal.createdBy)
        .where({ [meal.id]: mealId })
        .first();

    return query;
};

const getMeal = async (mealId: string, userId?: string) => {
    // Fetch from database
    const [meal, categoryRows, ingredientRows, methodRows] = await Promise.all([
        getFullMeal(mealId, userId),
        MealCategoryActions.selectByMealId(mealId),
        MealIngredientActions.selectByMealId(mealId),
        MealStepActions.selectByMealId(mealId),
    ]);

    const ingredients = mealIngredientRowsToResponse(ingredientRows);
    const method = mealStepRowsToResponse(methodRows);
    const categories = mealCategoryRowsToResponse(categoryRows);

    // Process results
    const result: GetMealResponseItem = {
        ...meal,
        ratingAverage: parseFloat(meal.ratingAverage),
        ingredients,
        method ,
        categories ,
    };

    return result;
};

const getMeals = async (userId?: string) => {
    // Fetch from database
    const [mealList, mealCategoriesList] = await Promise.all([getAllMeals(userId), MealCategoryActions.selectRows()]);
    
    // Process results
    const data: GetMealResponseItem[] = mealList.map(meal => ({ // TODO: Update GetMealResponseItem naming
        ...meal,
        ratingAverage: parseFloat(meal.ratingAverage),
        categories: mealCategoryRowsToResponse(mealCategoriesList.filter(cat => cat.mealId === meal.id))
    }));

    return data;
};

/**
 * Create a new meal or update an existing meal by mealId
 * @param mealItem
 * @param userId
 */
const insertMeal = async (mealItem: CreateMealRequestItem, userId: string) => {
    const mealId = mealItem.id ?? Uuid();

    const mealData: Meal = {
        id: mealId,
        name: mealItem.name,
        createdBy: userId,
        cookTime: mealItem.cookTime,
        notes: mealItem.notes,
        photo: mealItem.photo,
        prepTime: mealItem.prepTime,
        servings: mealItem.servings,
        source: mealItem.source,
        timesCooked: mealItem.timesCooked,
    };

    await db(lamington.meal).insert(mealData).onConflict(meal.id).merge();

    // Create new Ingredients rows
    const ingredientRows = ingredientsRequestToRows(mealItem.ingredients ?? {});
    await IngredientActions.createIngredients(ingredientRows);

    // Update MealIngredients rows
    const mealIngredientRows = mealIngredientsRequestToRows(mealId, mealItem.ingredients ?? {});
    await MealIngredientActions.updateRows(mealId, mealIngredientRows);

    // Update MealSteps rows
    const mealStepRows = mealMethodRequestToRows(mealId, mealItem.method ?? {});
    await MealStepActions.updateRows(mealId, mealStepRows);

    // Update MealCategories rows
    const mealCategoryRows = mealCategoriesRequestToRows(mealId, mealItem.categories ?? []);
    await MealCategoryActions.updateRows(mealId, mealCategoryRows);

    // Update Meal Rating row
    if (mealItem.ratingPersonal) {
        const mealRatingRow: MealRating = { mealId, raterId: userId, rating: mealItem.ratingPersonal };
        await MealRatingActions.insertRows(mealRatingRow);
    }
};

const MealActions = {
    insertMeal,
};

export default MealActions;

export { insertMeal, getMeal, getMeals, getMealCreator };

// Helpers
const ingredientsRequestToRows = (ingredients: MealIngredients): CreateIngredientParams[] =>
    Object.values(ingredients ?? {})
        .flat()
        .filter(({ ingredientId, name }) => name !== undefined)
        .map(({ ingredientId, name }) => ({ id: ingredientId, name }));

const mealIngredientsRequestToRows = (mealId: string, ingredients: MealIngredients): MealIngredient[] =>
    Object.entries(ingredients)
        .map(([sectionName, section]) =>
            section
                .map((ingItem, index) => {
                    if (!ingItem.ingredientId) return undefined;
                    return {
                        mealId,
                        ingredientId: ingItem.ingredientId,
                        section: sectionName,
                        index,
                        description: ingItem.description,
                        unit: ingItem.unit,
                        amount: ingItem.amount,
                        multiplier: ingItem.multiplier,
                    };
                })
                .filter(Undefined)
        )
        .flat();

const mealMethodRequestToRows = (mealId: string, method: MealMethod): MealStep[] =>
    Object.entries(method)
        .map(([sectionName, section]) =>
            section.map((step, index) => {
                return {
                    mealId,
                    stepId: step.stepId ?? Uuid(),
                    section: sectionName,
                    index,
                    description: step.description,
                };
            })
        )
        .flat();

const mealCategoriesRequestToRows = (mealId: string, categories: MealCategories): MealCategory[] =>
    categories.map(({ categoryId }) => ({
        mealId,
        categoryId,
    }));

const mealIngredientRowsToResponse = (ingredients: MealIngredientResults): MealIngredients => {
    const mealIngredients: MealIngredients = { default: [] };

    if (ingredients.length) {
        ingredients.map(ingItem => {
            mealIngredients[ingItem.section] = mealIngredients[ingItem.section] ?? [];
            mealIngredients[ingItem.section][ingItem.index] = {
                ingredientId: ingItem.ingredientId,
                amount: ingItem.amount,
                description: ingItem.description,
                multiplier: ingItem.multiplier,
                name: ingItem.name,
                namePlural: ingItem.namePlural,
                unit: ingItem.unit,
            };
        });
    }

    // Ensure that if there are gaps in ingredient indexes for whatever reason that they are
    // removed so as not to return null in place of an ingredient item. Overall order is still maintained
    const filteredMealIngredients = ObjectFromEntries(mealIngredients, responseDataItem =>
        responseDataItem.map(([section, ingredients]) => [section, ingredients.filter(Undefined)])
    );

    return filteredMealIngredients;
};

const mealStepRowsToResponse = (method: MealStepResults): MealMethod => {
    const responseData: MealMethod = { default: [] };

    if (method.length) {
        method.map(metItem => {
            responseData[metItem.section] = responseData[metItem.section] ?? [];
            responseData[metItem.section][metItem.index] = {
                stepId: metItem.stepId,
                description: metItem.description,
            };
        });
    }
    return responseData;
};

const mealCategoryRowsToResponse = (categories: MealCategoryByMealIdResults): MealCategories => {
    const responseData: MealCategories = categories.map(catItem => ({
        categoryId: catItem.categoryId,
        name: catItem.name,
        type: catItem.type,
    }));
    return responseData;
};
