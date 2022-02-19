export interface User {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    createdAt?: string;
    status?: string;
}

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
    ingredientId?: string;
    amount?: number;
    notes?: string;
    unit?: Unit;
    multiplier?: number;

    //response only
    name?: string;
    namePlural?: string;
}

export interface MealMethodStepItem {
    id?: string;
    description?: string;
    notes?: string;
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

interface MealMethodV1 {
    schema: 1; // in client - parse data by schema and then return just data object as ingredients
    data: {
        [sectionName: string]: Array<MealMethodStepItem>;
    };
}

export type MealMethod = MealMethodV1;

interface MealCategoriesV1 {
    schema: 1; // in client - parse data by schema and then return just data object as ingredients
    data: Array<string>;
}

export type MealCategories = MealCategoriesV1;

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
    mealId: Meal["id"];
    ingredientId: Ingredient["id"];
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



export interface MealStepsResults {
    number: number;
    step: string;
    section?: string;
    notes?: string;
}

