import {
    BasePaginatedRequestQuery,
    BasePaginatedResponse,
    BaseRequest,
    BaseRequestBody,
    BaseRequestBodyV2,
    BaseRequestParams,
    BaseResponse,
} from ".";
import { Tag } from "./tag";
import { User } from "./user";

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
    name: string;
    source?: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    tags?: RecipeTags;
    createdBy: Pick<User, "userId" | "firstName">;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    public?: boolean;
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

export type RecipeTags = { [tagGroup: string]: Partial<Tag> & { tags?: Array<Tag> } };

// Get all recipes
export type GetAllRecipesRequestQuery = BasePaginatedRequestQuery;
export type GetAllRecipesRequestParams = BaseRequestParams;
export type GetAllRecipesRequestBody = BaseRequestBody;

export type GetAllRecipesRequest = BaseRequest<
    GetAllRecipesRequestBody & GetAllRecipesRequestParams & GetAllRecipesRequestQuery
>;
export type GetAllRecipesResponse = BasePaginatedResponse<Recipes>;
export type GetAllRecipesService = (request: GetAllRecipesRequest) => GetAllRecipesResponse;

// Get all recipes for user
export type GetMyRecipesRequestQuery = BasePaginatedRequestQuery;
export type GetMyRecipesRequestParams = BaseRequestParams;
export type GetMyRecipesRequestBody = BaseRequestBody;

export type GetMyRecipesRequest = BaseRequest<
    GetMyRecipesRequestBody & GetMyRecipesRequestParams & GetMyRecipesRequestQuery
>;
export type GetMyRecipesResponse = BaseResponse<Recipes>;
export type GetMyRecipesService = (request: GetMyRecipesRequest) => GetMyRecipesResponse;

// Get recipe
export type GetRecipeRequestParams = BaseRequestParams<{ [recipeIdParam]: Recipe["recipeId"] }>;
export type GetRecipeRequestBody = BaseRequestBody;

export type GetRecipeRequest = BaseRequest<GetRecipeRequestParams & GetRecipeRequestBody>;
export type GetRecipeResponse = BaseResponse<Recipe>;
export type GetRecipeService = (request: GetRecipeRequest) => GetRecipeResponse;

// Post recipe
export type PostRecipeRequestParams = BaseRequestParams;
export type PostRecipeRequestBody = BaseRequestBodyV2<{
    recipeId: string;
    name: string;
    source?: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    tags?: RecipeTags;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    public?: boolean;
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
    getAllRecipes: GetAllRecipesService;
    getMyRecipes: GetMyRecipesService;
    getRecipe: GetRecipeService;
    postRecipe: PostRecipeService;
    deleteRecipe: DeleteRecipeService;
    postRecipeRating: PostRecipeRatingService;
}
