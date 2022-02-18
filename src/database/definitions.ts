type Table<T> = { [key in keyof T]: string };

export type ReadQuery<T> = T | Array<T>;

export type CreateQuery<T> = T | Array<T>;

export type ReadResponse<T> = Promise<Array<T>>;

export type CreateResponse<T> = Promise<Array<T>>;

interface Lamington {
    category: Category;
    ingredient: Ingredient;
}

export enum lamington {
    user = "user",
    meal = "meal",
    mealRating = "meal_rating",
    mealCategory = "meal_category",
    mealRoster = "meal_roster",
    mealIngredient = "meal_ingredient",
    mealStep = "meal_steps",
    category = "category",
    ingredient = "ingredient",
}

export enum users {
    id = "users.id",
    email = "users.email",
    firstName = "users.firstName",
    lastName = "users.lastName",
    password = "users.password",
    created = "users.created",
    status = "users.status",
}

export enum mealRatings {
    mealId = "meal_ratings.mealId",
    raterId = "meal_ratings.raterId",
    rating = "meal_ratings.rating",
}

/**
 * Contains the advanced ingredient list recipe, where each ingredient is it's own entity.
 */
export enum mealIngredients {
    id = "meal_ingredients.id",
    mealId = "meal_ingredients.mealId",
    ingredientId = "meal_ingredients.ingredientId",
}

export interface MealIngredientTable {
    id: string;
    mealId: string;
    ingredientId: string;
}

/**
 * Contains the advanced method for a recipe, where each step in the method is it's own entity.
 */
export enum mealSteps {
    mealId = "meal_steps.mealId",
    stepId = "meal_steps.stepId",
}

export interface MealStepsTable {
    mealId: string;
    stepId: string;
}

export enum mealCategories {
    mealId = "meal_categories.mealId",
    categoryId = "meal_categories.categoryId",
}

export enum mealRoster {
    mealId = "meal_roster.mealId",
    assigneeId = "meal_roster.assigneeId",
    assignmentDate = "meal_roster.assignmentDate",
    assignerId = "meal_roster.assignerId",
    cooked = "meal_roster.cooked",
}

/** Category */
export interface Category {
    id: string;
    type: string;
    name: string;
    notes: string | undefined;
}

export const category: Table<Category> = {
    id: "categories.id",
    type: "categories.type",
    name: "categories.name",
    notes: "categories.notes",
} as const;

/** Ingredient */
export interface Ingredient {
    id: string;
    name: string;
    namePlural: string | undefined;
    notes: string | undefined;
}

export const ingredient: Table<Ingredient> = {
    id: "ingredients.id",
    name: "ingredients.name",
    namePlural: "ingredients.namePlural",
    notes: "ingredients.notes",
} as const;

/** Meal */

export interface Meal {
    id: string;
    name: string;
    ingredients: string | undefined;
    method: string | undefined;
    source: string | undefined;
    photo: string | undefined;
    servings: number | undefined;
    prepTime: number | undefined;
    cookTime: number | undefined;
    cost: number | undefined;
    difficulty: number | undefined;
    notes: string | undefined;
    timesCooked: number | undefined;
    createdBy: string;
}

export const meal: Table<Meal> = {
    id: "meals.id",
    name: "meals.name",
    source: "meals.source",
    ingredients: "meals.ingredients",
    method: "meals.method",
    notes: "meals.notes",
    photo: "meals.photo",
    servings: "meals.servings",
    prepTime: "meals.prepTime",
    cookTime: "meals.cookTime",
    createdBy: "meals.createdBy",
    timesCooked: "meals.timesCooked",
    difficulty: "meals.difficulty",
    cost: "meals.cost",
};
