export interface User {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    createdAt?: string;
    status?: string;
}

export interface Meal {
    id: string;
    name: string;
    recipe: string;
    ingredients?: string | MealIngredientsResults[];
    method?: string | MealStepsResults[];
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    categories?: Category[];
    createdBy: string;
    timesCooked?: number;
}

export interface MealIngredient {
    id: string;
    mealId: string;
    ingredientId: string;
    unit: string; // enum of supported types?
    quantity: number;
    section?: string;
    notes?: string;
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


export interface MealIngredientsResults {
    ingredientId: string;
    ingredientName: string;
    unit: string; // enum of supported types?
    quantity: number;
    section?: string;
    notes?: string;
}

export interface MealStepsResults {
    number: number;
    step: string;
    section?: string;
    notes?: string;
}