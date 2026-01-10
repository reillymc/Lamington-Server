import type { ImageAttachment } from "./attachment.ts";
import type {
    BasePaginatedRequestQuery,
    BasePaginatedResponse,
    BaseRequest,
    BaseRequestBody,
    BaseRequestParams,
    BaseResponse,
    BaseSimpleRequestBody,
} from "./base.ts";
import type { FractionValue, NumberValue, RangeValue } from "./common.ts";
import type { Tag } from "./tag.ts";
import type { User } from "./user.ts";

export const recipeEndpoint = "/recipes" as const;

export const rateSubpath = "rate" as const;

export const recipeIdParam = "recipeId" as const;

export type RecipeIngredientAmount = FractionValue | RangeValue | NumberValue;

export type RecipeServings = {
    unit: string;
    count: RangeValue | NumberValue | FractionValue;
};

/**
 * Recipe
 */
export interface Recipe {
    recipeId: string;
    name: string;
    source?: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
    summary?: string;
    tips?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    tags?: ContentTags;
    owner: Pick<User, "userId" | "firstName">;
    cookTime?: number;
    prepTime?: number;
    servings?: RecipeServings;
    public?: boolean;
    nutritionalInformation?: string;
    timesCooked?: number;
    updatedAt?: string;
    createdAt?: string;
    attachments?: RecipeAttachments;
}

export interface RecipeIngredientItem {
    id: string;
    ingredientId?: string;
    subrecipeId?: string;
    amount?: RecipeIngredientAmount;
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
}

export type RecipeMethod = Array<Section<RecipeMethodStep>>;

export type ContentTags = { [tagGroup: string]: Partial<Tag> & { tags?: Array<Tag> } };

export type RecipeAttachments = {
    hero?: ImageAttachment;
};

/**
 * Get all recipes
 * Query params also support ...{ [parentCategoryId: string]: string[] }[]
 */
export type GetAllRecipesRequestQuery = BasePaginatedRequestQuery<{ ingredients?: string[]; tags?: string[] }>;
export type GetAllRecipesRequestParams = BaseRequestParams;
export type GetAllRecipesRequestBody = BaseRequestBody;

export type GetAllRecipesRequest = BaseRequest<
    GetAllRecipesRequestBody & GetAllRecipesRequestParams & GetAllRecipesRequestQuery
>;
export type GetAllRecipesResponse = BasePaginatedResponse<Array<Recipe>>;
export type GetAllRecipesService = (request: GetAllRecipesRequest) => GetAllRecipesResponse;

/**
 * Get all recipes for user
 * Query params also support ...{ [parentCategoryId: string]: string[] }[]
 */
export type GetMyRecipesRequestQuery = BasePaginatedRequestQuery<{ ingredients?: string[]; tags?: string[] }>;
export type GetMyRecipesRequestParams = BaseRequestParams;
export type GetMyRecipesRequestBody = BaseRequestBody;

export type GetMyRecipesRequest = BaseRequest<
    GetMyRecipesRequestBody & GetMyRecipesRequestParams & GetMyRecipesRequestQuery
>;
export type GetMyRecipesResponse = BasePaginatedResponse<Array<Recipe>>;
export type GetMyRecipesService = (request: GetMyRecipesRequest) => GetMyRecipesResponse;

// Get recipe
export type GetRecipeRequestParams = BaseRequestParams<{ [recipeIdParam]: Recipe["recipeId"] }>;
export type GetRecipeRequestBody = BaseRequestBody;

export type GetRecipeRequest = BaseRequest<GetRecipeRequestParams & GetRecipeRequestBody>;
export type GetRecipeResponse = BaseResponse<Recipe>;
export type GetRecipeService = (request: GetRecipeRequest) => GetRecipeResponse;

// Post recipe
export type PostRecipeRequestParams = BaseRequestParams;
export type PostRecipeRequestBody = BaseRequestBody<{
    name: Recipe["name"];
    source?: Recipe["source"];
    ingredients?: Recipe["ingredients"];
    method?: Recipe["method"];
    summary?: Recipe["summary"];
    tips?: Recipe["tips"];
    rating?: Recipe["ratingPersonal"];
    tags?: Array<{ tagId: Tag["tagId"] }>;
    cookTime?: Recipe["cookTime"];
    prepTime?: Recipe["prepTime"];
    servings?: Recipe["servings"];
    public?: Recipe["public"];
    timesCooked?: Recipe["timesCooked"];
    attachments?: RecipeAttachments;
}>;

export type PostRecipeRequest = BaseRequest<PostRecipeRequestBody & PostRecipeRequestParams>;
export type PostRecipeResponse = BaseResponse<Array<Recipe>>;
export type PostRecipeService = (request: PostRecipeRequest) => PostRecipeResponse;

// Put recipe
export type PutRecipeRequestParams = BaseRequestParams;
export type PutRecipeRequestBody = BaseRequestBody<{
    recipeId: Recipe["recipeId"];
    name?: Recipe["name"];
    source?: Recipe["source"];
    ingredients?: Recipe["ingredients"];
    method?: Recipe["method"];
    summary?: Recipe["summary"];
    tips?: Recipe["tips"];
    rating?: Recipe["ratingPersonal"];
    tags?: Array<{ tagId: Tag["tagId"] }>;
    cookTime?: Recipe["cookTime"];
    prepTime?: Recipe["prepTime"];
    servings?: Recipe["servings"];
    public?: Recipe["public"];
    timesCooked?: Recipe["timesCooked"];
    attachments?: RecipeAttachments;
}>;

export type PutRecipeRequest = BaseRequest<PutRecipeRequestBody & PutRecipeRequestParams>;
export type PutRecipeResponse = BaseResponse<Array<Recipe>>;
export type PutRecipeService = (request: PutRecipeRequest) => PutRecipeResponse;

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
export type PostRecipeRatingRequestBody = BaseSimpleRequestBody<{
    rating: Recipe["ratingPersonal"];
}>;

export type PostRecipeRatingRequest = BaseRequest<PostRecipeRatingRequestParams & PostRecipeRatingRequestBody>;
export type PostRecipeRatingResponse = BaseResponse<{
    rating: Recipe["ratingPersonal"];
}>;
export type PostRecipeRatingService = (request: PostRecipeRatingRequest) => PostRecipeRatingResponse;

export interface RecipeApi {
    getAllRecipes: GetAllRecipesService;
    getMyRecipes: GetMyRecipesService;
    getRecipe: GetRecipeService;
    postRecipe: PostRecipeService;
    putRecipe: PutRecipeService;
    deleteRecipe: DeleteRecipeService;
    postRecipeRating: PostRecipeRatingService;
}
