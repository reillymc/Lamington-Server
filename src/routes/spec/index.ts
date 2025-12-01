import { type AssetServices, ingredientsSubpath } from "./asset.ts";
import { type AttachmentServices, imageSubpath, uploadDirectory } from "./attachment.ts";
import { type AuthServices, loginSubpath, registerSubpath } from "./auth.ts";
import { type BookApi, bookIdParam, bookMemberIdParam, bookMemberSubpath, recipeSubpath } from "./book.ts";
import type { CookListServices } from "./cookList.ts";
import type { IngredientServices } from "./ingredient.ts";
import {
    type ListServices,
    itemIdParam,
    itemSubpath,
    listIdParam,
    listMemberIdParam,
    listMemberSubpath,
} from "./list.ts";
import {
    type PlannerServices,
    mealSubpath,
    monthParam,
    plannerIdParam,
    plannerMealIdParam,
    plannerMemberIdParam,
    plannerMemberSubpath,
    yearParam,
} from "./planner.ts";
import { rateSubpath, recipeIdParam, type RecipeApi } from "./recipe.ts";
import type { TagServices } from "./tag.ts";
import { type UserServices, approveSubpath, userIdParam } from "./user.ts";

export const AssetEndpoint = {
    getPresetIngredients: `/${ingredientsSubpath}`,
} as const satisfies Record<keyof AssetServices, string>;

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
    putBook: `/`,
    getBookRecipes: `/:${bookIdParam}/${recipeSubpath}`,
    postBookMember: `/:${bookIdParam}/${bookMemberSubpath}`,
    postBookRecipe: `/:${bookIdParam}/${recipeSubpath}`,
} as const satisfies Record<keyof BookApi, string>;

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
    getPlanner: `/:${plannerIdParam}{/:${yearParam}}{/:${monthParam}}`,
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
    putRecipe: `/`,
    postRecipeRating: `/:${recipeIdParam}/${rateSubpath}`,
} as const satisfies Record<keyof RecipeApi, string>;

export const TagEndpoint = {
    getTags: `/`,
} as const satisfies Record<keyof TagServices, string>;

export const UserEndpoint = {
    approveUser: `/:${userIdParam}/${approveSubpath}`,
    getPendingUsers: `/pending`,
    getUsers: `/`,
    deleteUsers: `/:${userIdParam}`,
} as const satisfies Record<keyof UserServices, string>;

export * from "./asset.ts";
export * from "./attachment.ts";
export * from "./auth.ts";
export type { BasePaginatedRequestQuery, QueryParam, RequestValidator } from "./base.ts";
export * from "./book.ts";
export * from "./common.ts";
export * from "./cookList.ts";
export * from "./ingredient.ts";
export * from "./list.ts";
export * from "./planner.ts";
export * from "./recipe.ts";
export * from "./tag.ts";
export * from "./user.ts";
