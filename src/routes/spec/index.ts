import { AuthenticatedBody } from "../../middleware";
import { AttachmentServices, imageSubpath, uploadDirectory } from "./attachment";
import { AuthServices, loginSubpath, registerSubpath } from "./auth";
import { bookIdParam, bookMemberIdParam, bookMemberSubpath, BookServices, recipeSubpath } from "./book";
import { IngredientServices } from "./ingredient";
import { itemIdParam, itemSubpath, listIdParam, ListServices, listMemberIdParam, listMemberSubpath } from "./list";
import { rateSubpath, recipeIdParam, RecipeServices } from "./recipe";
import { TagServices } from "./tag";
import { UserServices } from "./user";

export type BaseRequest<T = null> = T extends null ? {} : T;

export type BaseRequestParams<T = null> = T extends null ? {} : T;

export type BaseRequestBody<T = null> = AuthenticatedBody<T>;

interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory / remove
    code?: string;
    message?: string;
}

export type BaseResponse<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };

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

export const RecipeEndpoint = {
    deleteRecipe: `/:${recipeIdParam}`,
    getRecipe: `/:${recipeIdParam}`,
    getRecipes: `/`,
    postRecipe: `/`,
    postRecipeRating: `/:${recipeIdParam}/${rateSubpath}`,
} as const satisfies Record<keyof RecipeServices, string>;

export const TagEndpoint = {
    getTags: `/`,
} as const satisfies Record<keyof TagServices, string>;

export const UserEndpoint = {
    getUsers: `/`,
} as const satisfies Record<keyof UserServices, string>;

export * from "./attachment";
export * from "./auth";
export * from "./book";
export * from "./ingredient";
export * from "./list";
export * from "./recipe";
export * from "./tag";
export * from "./user";
