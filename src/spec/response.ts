interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory
    code?: string;
    message?: string;
}

export type ResponseBody<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };

interface MealIngredientItem {
    id: string;
    ingredientId?: string;
    recipeId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;
    name?: string;
    namePlural?: string;
}

interface Section<T> {
    sectionId: string;
    name: string;
    description?: string;
    items: Array<T>;
}

export type MealIngredients = Array<Section<MealIngredientItem>>;

interface MealMethodStep {
    id: string;
    stepId?: string;
    description?: string;
}

export type MealMethod = Array<Section<MealMethodStep>>;
interface MealCategoryItem {
    categoryId: string;
    type?: string;
    name?: string;
}

export type MealCategories = Array<MealCategoryItem>;

export interface Meal {
    mealId: string;
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

export interface Meals {
    [mealId: string]: Meal;
}
