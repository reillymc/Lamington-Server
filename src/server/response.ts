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
export type LamingtonAuthenticatedRequest<T> = Request<null, null, Partial<T> & AuthTokenData, null>;

export type Unit =
    | "Teaspoon"
    | "Tablespoon"
    | "Cup"
    | "Millilitre"
    | "Litre"
    | "Milligram"
    | "Gram"
    | "Kilogram"
    | "Pinch"
    | "Bunch"; //or could be none: e.g. 1 egg
    
export interface MealIngredientItem {
    id?: string;
    name?: string;
    namePlural?: string;
    amount?: number;
    notes?: string;
    unit?: Unit;
    multiplier?: number;
}

interface SchemaV1 {
    schema: 1; // in client - parse data by schema and then return just data object as ingredients
}

interface MealIngredientsV1 extends SchemaV1 {
    data: {
        [sectionName: string]: Array<MealIngredientItem>;
    };
}

export type MealIngredients = MealIngredientsV1;

export interface Meal {
    id: string;
    name: string;
    source?: string;
    ingredients?: MealIngredients;
    method?: MealMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    categories?: MealCategories;
    createdBy: User["id"];
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}