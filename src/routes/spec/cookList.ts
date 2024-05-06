import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from "./base";
import { User } from "./user";

export const cookListEndpoint = "/queue" as const;
export const cookListMealIdParam = "mealId" as const;

/**
 * Cook list meal
 */
export type CookListMeal = {
    id: string;
    createdBy: User["userId"];
    sequence?: number;
    meal: string;
    description?: string;
    source?: string;
    recipeId?: string;
};

// Get Cook List
export type GetCookListMealsRequestParams = BaseRequestParams;
export type GetCookListMealsRequestBody = BaseRequestBody;

export type GetCookListMealsRequest = BaseRequest<GetCookListMealsRequestParams & GetCookListMealsRequestBody>;
export type GetCookListMealsResponse = BaseResponse<CookListMeal[]>;
export type GetCookListMealsService = (request: GetCookListMealsRequest) => GetCookListMealsResponse;

// Post cook list meal
export type PostCookListMealRequestParams = BaseRequestParams;
export type PostCookListMealRequestBody = BaseRequestBody<CookListMeal>;

export type PostCookListMealRequest = BaseRequest<PostCookListMealRequestParams & PostCookListMealRequestBody>;
export type PostCookListMealResponse = BaseResponse;
export type PostCookListMealService = (request: PostCookListMealRequest) => PostCookListMealResponse;

// Delete cook list meal
export type DeleteCookListMealRequestParams = BaseRequestParams<{
    [cookListMealIdParam]: CookListMeal["id"];
}>;
export type DeleteCookListMealRequestBody = BaseRequestBody;

export type DeleteCookListMealRequest = BaseRequest<DeleteCookListMealRequestParams & DeleteCookListMealRequestBody>;
export type DeleteCookListMealResponse = BaseResponse;
export type DeleteCookListMealService = (request: DeleteCookListMealRequest) => DeleteCookListMealResponse;

export interface CookListServices {
    getMeals: GetCookListMealsService;
    postMeal: PostCookListMealService;
    deleteMeal: DeleteCookListMealService;
}
