import { v4 as Uuid } from "uuid";

import { Alias, Undefined } from "../helpers";

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
    user,
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
import MealSectionActions, { MealSectionResults } from "./mealSection";

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
            `${user.firstName} as createdBy`,
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
        .leftJoin(lamington.user, mealAlias.createdBy, user.userId)
        .groupBy(mealAlias.id);

    return query;
};

type GetFullMealResults = Meal & { ratingAverage: string }; // TODO: stop using Table suffix on types here

const getFullMeal = async (mealId: string, userId: string): Promise<GetFullMealResults> => {
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
            `${user.firstName} as createdBy`,
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
        .leftJoin(lamington.user, meal.createdBy, user.userId)
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

const getMeal = async (mealId: string, userId: string) => {
    // Fetch from database
    const [meal, categoryRows, ingredientRows, methodRows, sectionRows] = await Promise.all([
        getFullMeal(mealId, userId),
        MealCategoryActions.selectByMealId(mealId),
        MealIngredientActions.selectByMealId(mealId),
        MealStepActions.selectByMealId(mealId),
        MealSectionActions.selectByMealId(mealId),
    ]);

    // TODO convert rows to meal object: {[sectionId]: {name, description, index, ingredients: [], method: []}}
    const ingredients = mealIngredientRowsToResponse(ingredientRows, sectionRows);
    const method = mealStepRowsToResponse(methodRows, sectionRows);
    const categories = mealCategoryRowsToResponse(categoryRows);

    // Process results
    const result: GetMealResponseItem = {
        ...meal,
        ratingAverage: parseFloat(meal.ratingAverage),
        ingredients,
        method,
        categories,
    };

    return result;
};

const getMeals = async (userId?: string) => {
    // Fetch from database
    const [mealList, mealCategoriesList] = await Promise.all([getAllMeals(userId), MealCategoryActions.selectRows()]);

    // Process results
    const data: GetMealResponseItem[] = mealList.map(meal => ({
        // TODO: Update GetMealResponseItem naming
        ...meal,
        ratingAverage: parseFloat(meal.ratingAverage),
        categories: mealCategoryRowsToResponse(mealCategoriesList.filter(cat => cat.mealId === meal.id)),
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

    // Create new MealSections rows

    // Create new Ingredients rows
    const ingredientRows = ingredientsRequestToRows(mealItem.ingredients);
    if (ingredientRows) await IngredientActions.createIngredients(ingredientRows);

    // Update MealIngredients rows
    const mealIngredientRows = mealIngredientsRequestToRows(mealId, mealItem.ingredients);
    if (mealIngredientRows) await MealIngredientActions.updateRows(mealId, mealIngredientRows);

    // Update MealSteps rows
    const mealStepRows = mealMethodRequestToRows(mealId, mealItem.method);
    if (mealStepRows) await MealStepActions.updateRows(mealId, mealStepRows);

    // Update MealCategories rows
    const mealCategoryRows = mealCategoriesRequestToRows(mealId, mealItem.categories);
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
const ingredientsRequestToRows = (ingredientSections?: MealIngredients): CreateIngredientParams[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections
        .flatMap(({ items }) => items)
        .filter(({ name }) => name !== undefined)
        .map(({ ingredientId, name }) => ({ id: ingredientId, name }));
};

const mealIngredientsRequestToRows = (
    mealId: string,
    ingredientSections?: MealIngredients
): MealIngredient[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId) return undefined;
                return {
                    id: ingItem.id,
                    mealId,
                    ingredientId: ingItem.ingredientId,
                    recipeId: ingItem.recipeId,
                    sectionId,
                    index,
                    description: ingItem.description,
                    unit: ingItem.unit,
                    amount: ingItem.amount,
                    multiplier: ingItem.multiplier,
                };
            })
            .filter(Undefined)
    );
};

const mealMethodRequestToRows = (mealId: string, methodSections?: MealMethod): MealStep[] | undefined => {
    if (!methodSections?.length) return;

    return methodSections.flatMap(({ sectionId, items }) =>
        items.map((step, index): MealStep => {
            return {
                id: step.id,
                mealId,
                stepId: step.stepId ?? Uuid(),
                sectionId,
                index,
                description: step.description,
            };
        })
    );
};

const mealCategoriesRequestToRows = (mealId: string, categories: MealCategories = []): MealCategory[] =>
    categories.map(({ categoryId }) => ({
        mealId,
        categoryId,
    }));

const mealIngredientRowsToResponse = (
    ingredients: MealIngredientResults,
    sections: MealSectionResults
): MealIngredients => {
    const mealIngredients: MealIngredients = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients.filter(ingredient => ingredient.sectionId === sectionId),
        }));

    return mealIngredients;
};

const mealStepRowsToResponse = (method: MealStepResults, sections: MealSectionResults): MealMethod => {
    const mealMethod: MealMethod = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method.filter(method => method.sectionId === sectionId),
        }));

    return mealMethod;
};

const mealCategoryRowsToResponse = (categories: MealCategoryByMealIdResults): MealCategories => {
    const responseData: MealCategories = categories.map(catItem => ({
        categoryId: catItem.categoryId,
        name: catItem.name,
        type: catItem.type,
    }));
    return responseData;
};
