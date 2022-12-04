// TODO remove ===
interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory
    code?: string;
    message?: string;
}

export type ResponseBody<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };

// ===
interface RecipeIngredientItem {
    id: string;
    ingredientId?: string;
    subrecipeId?: string;
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

export type RecipeIngredients = Array<Section<RecipeIngredientItem>>;

interface RecipeMethodStep {
    id: string;
    stepId?: string;
    description?: string;
}

export type RecipeMethod = Array<Section<RecipeMethodStep>>;
interface RecipeCategoryItem {
    categoryId: string;
    type?: string;
    name?: string;
}

export type RecipeCategories = Array<RecipeCategoryItem>;

export interface Recipe {
    recipeId: string;
    name?: string;
    source?: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    categories?: RecipeCategories;
    createdBy: string;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

export interface Recipes {
    [recipeId: string]: Recipe;
}
