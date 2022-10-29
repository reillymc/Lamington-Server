import { Request, Response } from "express";
import { AuthTokenData } from "../authentication/auth";

interface BaseResponse {
    error: boolean;
    schema?: 1; // TODO make mandatory
    message?: string;
}

export type LamingtonResponse = Response<BaseResponse>;
export type LamingtonDataResponse<T> = Response<BaseResponse & { data?: T }>;

export type LamingtonRequest<T> = Request<null, null, Partial<T>, null>;
export type LamingtonAuthenticatedRequest<T, P = null> = Request<P, null, Partial<T> & AuthTokenData, null>;


interface MealIngredientItem {
    ingredientId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;
    name?: string;
    namePlural?: string;
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
    type?: string;
    name?: string;
}

type MealCategories = Array<MealCategoryItem>;


export interface Meal {
    id: string;
    name?: string;
    source?: string;
    ingredients?: MealIngredients;
    method?: MealMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    categories?: MealCategories;
    createdBy: string;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

export { MealIngredients, MealMethod, MealCategories }