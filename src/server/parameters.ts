

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

    export enum Difficulty {
        Undefined,
        Easy,
        Medium,
        Hard
    }

    export enum Cost {
        $,
        $$,
        $$$,
        $$$$
    }

export interface MealIngredient {
    id: string;
    mealId: string;
    ingredientId: string;
}
export interface Ingredient {
    id: string;
    name: string;
    notes?: string;
}

export interface Category {
    id: string;
    type: string;
    name: string;
    description?: string;
    mealId?: string;
}

export interface MealCategory {
    mealId: string;
    categoryId: string;
    name: string;
    description?: string;
}

export interface MealRating {
    mealId: string;
    rating: number; // can be string when using AVG
    raterId?: string;
}

export interface MealRoster {}

export interface Authentication {
    token: string;
    token_type: string;
}

