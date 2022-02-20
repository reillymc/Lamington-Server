/**
 * Create Meal
 */

import { AuthTokenData } from "../../authentication/auth";

interface MealIngredientItem {
    ingredientId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;
}

interface MealIngredients {
    [sectionName: string]: Array<MealIngredientItem>;
}

interface MealMethodStep {
    stepId?: string;
    description?: string;
}

interface MealMethod {
    [sectionName: string]: Array<MealMethodStep>;
}
interface MealCategoryItem {
    categoryId: string;
}

type MealCategories = Array<MealCategoryItem>;

export type CreateRequestData = {
    format: 1; // Use this instead of schema on each type
}

interface MealV1 {
    id?: string;
    name?: string;
    source?: string;
    ingredients?: MealIngredients;
    method?: MealMethod;
    notes?: string;
    photo?: string;
    ratingPersonal?: number;
    categories?: MealCategories;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

type Meal = MealV1;

type CreateMealBody = AuthTokenData & Meal & CreateRequestData;

export { Meal, CreateMealBody };
