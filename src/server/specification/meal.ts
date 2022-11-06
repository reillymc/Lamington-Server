/**
 * Create Meal
 */

import { AuthenticatedBody } from "../../authentication/auth";

interface MealIngredientItem {
    id: string;
    ingredientId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;

    // on create request only
    name?: string;
}
interface Section<T> {
    sectionId: string;
    name: string;
    description?: string;
    items: Array<T>;
}

type MealIngredients = Array<Section<MealIngredientItem>>;

interface MealMethodStep {
    id: string;
    stepId?: string;
    description?: string;
}

type MealMethod = Array<Section<MealMethodStep>>;

interface MealCategoryItem {
    categoryId: string;
}

type MealCategories = Array<MealCategoryItem>;

export type CreateRequestData = {
    format: 1; // Use this instead of schema on each type
};

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

type CreateMealBody = AuthenticatedBody & Meal & CreateRequestData;

export { Meal, CreateMealBody };
