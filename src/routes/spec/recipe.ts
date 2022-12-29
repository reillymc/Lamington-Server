import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";

export const recipeEndpoint = "/recipes" as const;

export const rateSubpath = "rate" as const;

export const recipeIdParam = "recipeId" as const;

/**
 * Recipes
 */
export interface Recipes {
    [recipeId: string]: Recipe;
}

/**
 * Recipe
 */
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

export interface RecipeIngredientItem {
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

export interface RecipeMethodStep {
    id: string;
    description?: string;
    photo?: string;
}

export type RecipeMethod = Array<Section<RecipeMethodStep>>;
interface RecipeCategoryItem {
    categoryId: string;
    type?: string;
    name?: string;
}

export type RecipeCategories = Array<RecipeCategoryItem>;

// Get recipes
export type GetRecipesRequestParams = BaseRequestParams;
export type GetRecipesRequestBody = BaseRequestBody;

export type GetRecipesRequest = BaseRequest<GetRecipesRequestBody & GetRecipesRequestParams>;
export type GetRecipesResponse = BaseResponse<Recipes>;
export type GetRecipesService = (request: GetRecipesRequest) => GetRecipesResponse;

// Get recipe
export type GetRecipeRequestParams = BaseRequestParams<{ [recipeIdParam]: Recipe["recipeId"] }>;
export type GetRecipeRequestBody = BaseRequestBody;

export type GetRecipeRequest = BaseRequest<GetRecipeRequestParams & GetRecipeRequestBody>;
export type GetRecipeResponse = BaseResponse<Recipe>;
export type GetRecipeService = (request: GetRecipeRequest) => GetRecipeResponse;

// Post recipe
export type PostRecipeRequestParams = BaseRequestParams;
export type PostRecipeRequestBody = BaseRequestBody<{
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
}>;

export type PostRecipeRequest = BaseRequest<PostRecipeRequestBody & PostRecipeRequestParams>;
export type PostRecipeResponse = BaseResponse;
export type PostRecipeService = (request: PostRecipeRequest) => PostRecipeResponse;

// Delete recipe
export type DeleteRecipeRequestParams = BaseRequestParams<{ [recipeIdParam]: Recipe["recipeId"] }>;
export type DeleteRecipeRequestBody = BaseRequestBody;

export type DeleteRecipeRequest = BaseRequest<DeleteRecipeRequestParams & DeleteRecipeRequestBody>;
export type DeleteRecipeResponse = BaseResponse;
export type DeleteRecipeService = (request: DeleteRecipeRequest) => DeleteRecipeResponse;

// Delete recipe item
export type PostRecipeRatingRequestParams = BaseRequestParams<{
    [recipeIdParam]: Recipe["recipeId"];
}>;
export type PostRecipeRatingRequestBody = BaseRequestBody<{
    rating?: Recipe["ratingPersonal"];
}>;

export type PostRecipeRatingRequest = BaseRequest<PostRecipeRatingRequestParams & PostRecipeRatingRequestBody>;
export type PostRecipeRatingResponse = BaseResponse;
export type PostRecipeRatingService = (request: PostRecipeRatingRequest) => PostRecipeRatingResponse;

export interface RecipeServices {
    getRecipes: GetRecipesService;
    getRecipe: GetRecipeService;
    postRecipe: PostRecipeService;
    deleteRecipe: DeleteRecipeService;
    postRecipeRating: PostRecipeRatingService;
}
