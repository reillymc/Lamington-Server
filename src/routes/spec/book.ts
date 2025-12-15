import type {
    BasePaginatedRequestQuery,
    BasePaginatedResponse,
    BaseRequest,
    BaseRequestBody,
    BaseRequestParams,
    BaseResponse,
    BaseSimpleRequestBody,
} from "./base.ts";
import type { EntityMember, EntityMembers } from "./common.ts";
import { type Recipe, recipeIdParam } from "./recipe.ts";
import type { User } from "./user.ts";

export const bookEndpoint = "/books" as const;

export const recipeSubpath = "recipes" as const;
export const bookMemberSubpath = "members" as const;

export const bookIdParam = "bookId" as const;
export const bookMemberIdParam = "userId" as const;

/**
 * Book
 */
export type Book = {
    bookId: string;
    name: string;
    owner: Pick<User, "userId" | "firstName">;
    description?: string;
    color?: string;
    icon?: string;
    status?: string;
    members?: Array<EntityMember>;
};

// Get books
export type GetBooksRequestParams = BaseRequestParams<{
    owner?: User["userId"];
}>;
export type GetBooksRequestBody = BaseRequestBody;

export type GetBooksRequest = BaseRequest<GetBooksRequestBody & GetBooksRequestParams>;
export type GetBooksResponse = BaseResponse<Array<Book>>;
export type GetBooksService = (request: GetBooksRequest) => GetBooksResponse;

// Get book
export type GetBookRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type GetBookRequestBody = BaseRequestBody;

export type GetBookRequest = BaseRequest<GetBookRequestParams & GetBookRequestBody>;
export type GetBookResponse = BaseResponse<Book>;
export type GetBookService = (request: GetBookRequest) => GetBookResponse;

// Post book
export type PostBookRequestParams = BaseRequestParams;
export type PostBookRequestBody = BaseRequestBody<{
    name: Book["name"];
    description?: Book["description"];
    color?: Book["color"];
    icon?: Book["icon"];
    members?: Array<EntityMember>;
}>;

export type PostBookRequest = BaseRequest<PostBookRequestBody & PostBookRequestParams>;
export type PostBookResponse = BaseResponse<Array<Book>>;
export type PostBookService = (request: PostBookRequest) => PostBookResponse;

// Put book
export type PutBookRequestParams = BaseRequestParams;
export type PutBookRequestBody = BaseRequestBody<{
    bookId: Book["bookId"];
    name?: Book["name"];
    description?: Book["description"];
    color?: Book["color"];
    icon?: Book["icon"];
    members?: Array<EntityMember>;
}>;

export type PutBookRequest = BaseRequest<PutBookRequestBody & PutBookRequestParams>;
export type PutBookResponse = BaseResponse<Array<Book>>;
export type PutBookService = (request: PutBookRequest) => PutBookResponse;

// Delete book
export type DeleteBookRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type DeleteBookRequestBody = BaseSimpleRequestBody;

export type DeleteBookRequest = BaseRequest<DeleteBookRequestParams & DeleteBookRequestBody>;
export type DeleteBookResponse = BaseResponse;
export type DeleteBookService = (request: DeleteBookRequest) => DeleteBookResponse;

// Post book recipe
export type PostBookRecipeRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type PostBookRecipeRequestBody = BaseRequestBody<{
    recipeId: Recipe["recipeId"];
}>;

export type PostBookRecipeRequest = BaseRequest<PostBookRecipeRequestParams & PostBookRecipeRequestBody>;
export type PostBookRecipeResponse = BaseResponse<{
    recipeId: Recipe["recipeId"];
}>;
export type PostBookRecipeService = (request: PostBookRecipeRequest) => PostBookRecipeResponse;

// Get book recipes
export type GetBookRecipesRequestQuery = BasePaginatedRequestQuery;
export type GetBookRecipesRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type GetBookRecipesRequestBody = BaseRequestBody;

export type GetBookRecipesRequest = BaseRequest<
    GetBookRecipesRequestQuery & GetBookRecipesRequestParams & GetBookRecipesRequestBody
>;
export type GetBookRecipesResponse = BasePaginatedResponse<Array<Recipe>>;
export type GetBookRecipesService = (request: GetBookRecipesRequest) => GetBookRecipesResponse;

// Delete book recipe
export type DeleteBookRecipeRequestParams = BaseRequestParams<{
    [bookIdParam]: Book["bookId"];
    [recipeIdParam]: Recipe["recipeId"];
}>;
export type DeleteBookRecipeRequestBody = BaseSimpleRequestBody;

export type DeleteBookRecipeRequest = BaseRequest<DeleteBookRecipeRequestParams & DeleteBookRecipeRequestBody>;
export type DeleteBookRecipeResponse = BaseResponse;
export type DeleteBookRecipeService = (request: DeleteBookRecipeRequest) => DeleteBookRecipeResponse;

// Post book member
export type PostBookMemberRequestParams = BaseRequestParams<{
    [bookIdParam]: Book["bookId"];
}>;
export type PostBookMemberRequestBody = BaseSimpleRequestBody;

export type PostBookMemberRequest = BaseRequest<PostBookMemberRequestParams & PostBookMemberRequestBody>;
export type PostBookMemberResponse = BaseResponse<{
    userId: User["userId"];
    status?: string;
}>;
export type PostBookMemberService = (request: PostBookMemberRequest) => PostBookMemberResponse;

// Delete book member
export type DeleteBookMemberRequestParams = BaseRequestParams<{
    [bookIdParam]: Book["bookId"];
    [bookMemberIdParam]: User["userId"];
}>;
export type DeleteBookMemberRequestBody = BaseSimpleRequestBody;

export type DeleteBookMemberRequest = BaseRequest<DeleteBookMemberRequestParams & DeleteBookMemberRequestBody>;
export type DeleteBookMemberResponse = BaseResponse;
export type DeleteBookMemberService = (request: DeleteBookMemberRequest) => DeleteBookMemberResponse;

export interface BookApi {
    deleteBook: DeleteBookService;
    deleteBookRecipe: DeleteBookRecipeService;
    getBook: GetBookService;
    getBooks: GetBooksService;
    postBook: PostBookService;
    putBook: PutBookService;
    getBookRecipes: GetBookRecipesService;
    postBookRecipe: PostBookRecipeService;
    postBookMember: PostBookMemberService;
    deleteBookMember: DeleteBookMemberService;
}
