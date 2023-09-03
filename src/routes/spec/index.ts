import { AttachmentServices, imageSubpath, uploadDirectory } from "./attachment";
import { AuthServices, loginSubpath, registerSubpath } from "./auth";
import { bookIdParam, bookMemberIdParam, bookMemberSubpath, BookServices, recipeSubpath } from "./book";
import { CookListServices } from "./cookList";
import { IngredientServices } from "./ingredient";
import { itemIdParam, itemSubpath, listIdParam, ListServices, listMemberIdParam, listMemberSubpath } from "./list";
import {
    plannerMealIdParam,
    mealSubpath,
    monthParam,
    plannerIdParam,
    plannerMemberIdParam,
    plannerMemberSubpath,
    PlannerServices,
    yearParam,
} from "./planner";
import { rateSubpath, recipeIdParam, RecipeServices } from "./recipe";
import { TagServices } from "./tag";
import { approveSubpath, userIdParam, UserServices } from "./user";

export type QueryParam = undefined | string | string[];

export type BaseRequest<T = null> = T extends null ? {} : T;

export type BaseRequestParams<T = null> = T extends null ? {} : { [P in keyof T]: string };

type LamingtonQueryParams = { page?: QueryParam; sort?: QueryParam; search?: QueryParam; order?: QueryParam };

export type BasePaginatedRequestQuery<T = null> = T extends null ? LamingtonQueryParams : T & LamingtonQueryParams;

export type BaseSimpleRequestBody<T = null> = T extends null ? {} : Partial<T>;

export type BaseRequestBody<T = null> = T extends null ? {} : { data: Partial<T> | null | Array<Partial<T> | null> };

export type RequestValidator<T extends BaseRequestBody<unknown>> = (
    body: T,
    userId: string
) => readonly [Array<Exclude<T["data"], any[] | null> extends Partial<infer R> ? R : never>, Array<unknown>];

interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory / remove
    code?: string;
    message?: string;
}

export type BaseResponse<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };
export type BasePaginatedResponse<T = null> = BaseResponse<T> & { page?: number; nextPage?: number };

export const AttachmentEndpoint = {
    postImage: `/${imageSubpath}`,
    downloadImage: `/${uploadDirectory}`,
} as const satisfies Record<keyof AttachmentServices, string>;

export const AuthEndpoint = {
    login: `/${loginSubpath}`,
    register: `/${registerSubpath}`,
} as const satisfies Record<keyof AuthServices, string>;

export const BookEndpoint = {
    deleteBook: `/:${bookIdParam}`,
    deleteBookMember: `/:${bookIdParam}/${bookMemberSubpath}/:${bookMemberIdParam}`,
    deleteBookRecipe: `/:${bookIdParam}/${recipeSubpath}/:${recipeIdParam}`,
    getBook: `/:${bookIdParam}`,
    getBooks: `/`,
    postBook: `/`,
    postBookMember: `/:${bookIdParam}/${bookMemberSubpath}`,
    postBookRecipe: `/:${bookIdParam}/${recipeSubpath}`,
} as const satisfies Record<keyof BookServices, string>;

export const IngredientEndpoint = {
    getIngredients: `/`,
    getMyIngredients: `/my`,
    postIngredient: `/`,
} as const satisfies Record<keyof IngredientServices, string>;

export const ListEndpoint = {
    deleteList: `/:${listIdParam}`,
    deleteListItem: `/:${listIdParam}/${itemSubpath}/:${itemIdParam}`,
    deleteListMember: `/:${listIdParam}/${listMemberSubpath}/:${listMemberIdParam}`,
    getList: `/:${listIdParam}`,
    getLists: `/`,
    postList: `/`,
    postListItem: `/:${listIdParam}/${itemSubpath}`,
    postListMember: `/:${listIdParam}/${listMemberSubpath}`,
} as const satisfies Record<keyof ListServices, string>;

export const PlannerEndpoint = {
    deletePlanner: `/:${plannerIdParam}`,
    deletePlannerMember: `/:${plannerIdParam}/${plannerMemberSubpath}/:${plannerMemberIdParam}`,
    deletePlannerMeal: `/:${plannerIdParam}/${mealSubpath}/:${plannerMealIdParam}`,
    getPlanner: `/:${plannerIdParam}/:${yearParam}?/:${monthParam}?`,
    getPlanners: `/`,
    postPlanner: `/`,
    postPlannerMember: `/:${plannerIdParam}/${plannerMemberSubpath}`,
    postPlannerMeal: `/:${plannerIdParam}/${mealSubpath}`,
} as const satisfies Record<keyof PlannerServices, string>;

export const CookListEndpoint = {
    getMeals: `/`,
    postMeal: `/`,
    deleteMeal: `/:${plannerMealIdParam}`,
} as const satisfies Record<keyof CookListServices, string>;

export const RecipeEndpoint = {
    deleteRecipe: `/:${recipeIdParam}`,
    getRecipe: `/:${recipeIdParam}`,
    getAllRecipes: `/`,
    getMyRecipes: `/my`,
    postRecipe: `/`,
    postRecipeRating: `/:${recipeIdParam}/${rateSubpath}`,
} as const satisfies Record<keyof RecipeServices, string>;

export const TagEndpoint = {
    getTags: `/`,
} as const satisfies Record<keyof TagServices, string>;

export const UserEndpoint = {
    approveUser: `/:${userIdParam}/${approveSubpath}`,
    getPendingUsers: `/pending`,
    getUsers: `/`,
} as const satisfies Record<keyof UserServices, string>;

export * from "./attachment";
export * from "./auth";
export * from "./book";
export * from "./common";
export * from "./cookList";
export * from "./ingredient";
export * from "./list";
export * from "./planner";
export * from "./recipe";
export * from "./tag";
export * from "./user";
