import {
    type AttachmentServices,
    type AuthServices,
    type BookApi,
    type RecipeApi,
    type GetAllRecipesRequestQuery,
    type GetMyRecipesRequestQuery,
    type IngredientServices,
    type TagServices,
    type UserServices,
    approveSubpath,
    attachmentEndpoint,
    authEndpoint,
    bookEndpoint,
    bookMemberSubpath,
    imageSubpath,
    ingredientEndpoint,
    loginSubpath,
    rateSubpath,
    recipeEndpoint,
    recipeSubpath,
    registerSubpath,
    tagEndpoint,
    uploadDirectory,
    usersEndpoint,
} from "../../src/routes/spec/index.ts";

const ServerURL = "";
const ApiVersion = "v1";
const ApiUrl = `${ServerURL}/${ApiVersion}` as const;

type Endpoint = string | ((...param: Array<any>) => string);

type LamingtonQueryParams<T> = Omit<T, "page"> & {
    page?: number;
    sort?: string;
    search?: string;
    direction?: string;
};

export const AttachmentEndpoint = {
    postImage: `${ApiUrl}${attachmentEndpoint}/${imageSubpath}` as const,
    downloadImage: `${ApiUrl}${attachmentEndpoint}/${uploadDirectory}/` as const,
} as const satisfies Record<keyof AttachmentServices, Endpoint>;

export const AuthEndpoint = {
    login: `${ApiUrl}${authEndpoint}/${loginSubpath}` as const,
    register: `${ApiUrl}${authEndpoint}/${registerSubpath}` as const,
} as const satisfies Record<keyof AuthServices, Endpoint>;

export const BookEndpoint = {
    deleteBook: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}` as const,
    deleteBookRecipe: (bookId: string, recipeId: string) =>
        `${ApiUrl}${bookEndpoint}/${bookId}/${recipeSubpath}/${recipeId}` as const,
    getBook: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}` as const,
    getBooks: `${ApiUrl}${bookEndpoint}`,
    postBook: `${ApiUrl}${bookEndpoint}`,
    putBook: `${ApiUrl}${bookEndpoint}`,
    postBookRecipe: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}/${recipeSubpath}` as const,
    deleteBookMember: (bookId: string, memberId: string) =>
        `${ApiUrl}${bookEndpoint}/${bookId}/${bookMemberSubpath}/${memberId}` as const,
    postBookMember: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}/${bookMemberSubpath}` as const,
    getBookRecipes: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}/${recipeSubpath}` as const,
} as const satisfies Record<keyof BookApi, Endpoint>;

export const IngredientEndpoint = {
    getIngredients: `${ApiUrl}${ingredientEndpoint}`,
    postIngredient: `${ApiUrl}${ingredientEndpoint}`,
    getMyIngredients: `${ApiUrl}${ingredientEndpoint}/my`,
} as const satisfies Record<keyof IngredientServices, Endpoint>;

export const RecipeEndpoint = {
    deleteRecipe: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}` as const,
    getRecipe: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}` as const,
    getAllRecipes: (query?: LamingtonQueryParams<GetAllRecipesRequestQuery>) =>
        `${ApiUrl}${recipeEndpoint}${appendQuery(query)}` as const,
    getMyRecipes: (query?: LamingtonQueryParams<GetMyRecipesRequestQuery>) =>
        `${ApiUrl}${recipeEndpoint}/my${appendQuery(query)}` as const,
    postRecipe: `${ApiUrl}${recipeEndpoint}`,
    postRecipeRating: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}/${rateSubpath}` as const,
    putRecipe: `${ApiUrl}${recipeEndpoint}`,
} as const satisfies Record<keyof RecipeApi, Endpoint>;

export const TagEndpoint = {
    getTags: `${ApiUrl}${tagEndpoint}`,
} as const satisfies Record<keyof TagServices, Endpoint>;

export const UserEndpoint = {
    approveUser: (userId: string) => `${ApiUrl}${usersEndpoint}/${userId}/${approveSubpath}` as const,
    getPendingUsers: `${ApiUrl}${usersEndpoint}/pending`,
    getUsers: `${ApiUrl}${usersEndpoint}`,
    deleteUsers: (userId: string) => `${ApiUrl}${usersEndpoint}/${userId}`,
} as const satisfies Record<keyof UserServices, Endpoint>;

const appendQuery = <T extends Record<string, unknown> | undefined>(query: T) => {
    if (!query) return "";

    let uri = "?";

    for (const [key, value] of Object.entries(query)) {
        if (!value) continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                uri += `${key}=${item}&`;
            }
        } else {
            uri += `${key}=${value}&`;
        }
    }

    // remove last ampersand / question mark
    uri = uri.slice(0, -1);

    return uri;
};
