import { AssetServices, ingredientsSubpath } from "./asset";
import { AttachmentServices, imageSubpath, uploadDirectory } from "./attachment";
import { AuthServices, loginSubpath, registerSubpath } from "./auth";
import { BookServices, bookIdParam, bookMemberIdParam, bookMemberSubpath, recipeSubpath } from "./book";
import { CookListServices } from "./cookList";
import { IngredientServices } from "./ingredient";
import { ListServices, itemIdParam, itemSubpath, listIdParam, listMemberIdParam, listMemberSubpath } from "./list";
import {
    PlannerServices,
    mealSubpath,
    monthParam,
    plannerIdParam,
    plannerMealIdParam,
    plannerMemberIdParam,
    plannerMemberSubpath,
    yearParam,
} from "./planner";
import { RecipeServices, rateSubpath, recipeIdParam } from "./recipe";
import { TagServices } from "./tag";
import { UserServices, approveSubpath, userIdParam } from "./user";

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
    deleteUsers: `/:${userIdParam}`,
} as const satisfies Record<keyof UserServices, string>;

export * from "./asset";
export * from "./attachment";
export * from "./auth";
export { BasePaginatedRequestQuery, QueryParam, RequestValidator } from "./base";
export * from "./book";
export * from "./common";
export * from "./cookList";
export * from "./ingredient";
export * from "./list";
export * from "./planner";
export * from "./recipe";
export * from "./tag";
export * from "./user";
