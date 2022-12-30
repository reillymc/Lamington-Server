import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";

export const ingredientEndpoint = "/ingredients" as const;

/**
 * Ingredients
 */
export interface Ingredients {
    [ingredientId: string]: Ingredient;
}

/**
 * Ingredient
 */
export interface Ingredient {
    ingredientId: string;
    name: string;
    description?: string;
    photo?: string;
    createdBy?: string;
}

// Get ingredients
export type GetIngredientsRequestParams = BaseRequestParams;
export type GetIngredientsRequestBody = BaseRequestBody;

export type GetIngredientsRequest = BaseRequest<GetIngredientsRequestBody & GetIngredientsRequestParams>;
export type GetIngredientsResponse = BaseResponse<Ingredients>;
export type GetIngredientsService = (request: GetIngredientsRequest) => GetIngredientsResponse;

// Post ingredient
export type PostIngredientRequestParams = BaseRequestParams;
export type PostIngredientRequestBody = BaseRequestBody<{
    ingredientId?: Ingredient["ingredientId"];
    name?: Ingredient["name"];
    description?: Ingredient["description"];
    photo?: Ingredient["photo"];
}>;

export type PostIngredientRequest = BaseRequest<PostIngredientRequestBody & PostIngredientRequestParams>;
export type PostIngredientResponse = BaseResponse<Ingredient>;
export type PostIngredientService = (request: PostIngredientRequest) => PostIngredientResponse;

export interface IngredientServices {
    getIngredients: GetIngredientsService;
    postIngredient: PostIngredientService;
}
