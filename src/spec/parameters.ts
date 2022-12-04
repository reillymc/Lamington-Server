

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

export interface RecipeIngredient {
    id: string;
    recipeId: string;
    ingredientId: string;
}


export interface RecipeCategory {
    recipeId: string;
    categoryId: string;
    name: string;
    description?: string;
}

export interface RecipeRating {
    recipeId: string;
    rating: number; // can be string when using AVG
    raterId?: string;
}

export interface RecipeRoster {}

export interface Authentication {
    token: string;
    token_type: string;
}

