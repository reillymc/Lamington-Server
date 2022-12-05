import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";
import { User } from "./user";
import { Recipe, recipeIdParam } from "./recipe";

export const bookEndpoint = "/books" as const;

export const recipeSubpath = "recipes" as const;

export const bookIdParam = "bookId" as const;

/**
 * Books
 */
export type Books = {
    [bookId: string]: Book;
};

/**
 * Book
 */
export type Book = {
    bookId: string;
    name: string;
    createdBy: Pick<User, "userId" | "firstName">;
    description: string | undefined;
    recipes?: Array<Recipe["recipeId"]>;
};

// Get books
export type GetBooksRequestParams = BaseRequestParams;
export type GetBooksRequestBody = BaseRequestBody;

export type GetBooksRequest = BaseRequest<GetBooksRequestBody & GetBooksRequestParams>;
export type GetBooksResponse = BaseResponse<Books>;
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
    name?: Book["name"];
    bookId?: Book["bookId"];
    description?: Book["description"];
}>;

export type PostBookRequest = BaseRequest<PostBookRequestBody & PostBookRequestParams>;
export type PostBookResponse = BaseResponse;
export type PostBookService = (request: PostBookRequest) => PostBookResponse;

// Delete book
export type DeleteBookRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type DeleteBookRequestBody = BaseRequestBody;

export type DeleteBookRequest = BaseRequest<DeleteBookRequestParams & DeleteBookRequestBody>;
export type DeleteBookResponse = BaseResponse;
export type DeleteBookService = (request: DeleteBookRequest) => DeleteBookResponse;

// Post book recipe
export type PostBookRecipeRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type PostBookRecipeRequestBody = BaseRequestBody<{
    recipeId?: Recipe["recipeId"];
}>;

export type PostBookRecipeRequest = BaseRequest<PostBookRecipeRequestParams & PostBookRecipeRequestBody>;
export type PostBookRecipeResponse = BaseResponse;
export type PostBookRecipeService = (request: PostBookRecipeRequest) => PostBookRecipeResponse;

// Delete book recipe
export type DeleteBookRecipeRequestParams = BaseRequestParams<{
    [bookIdParam]: Book["bookId"];
    [recipeIdParam]: Recipe["recipeId"];
}>;
export type DeleteBookRecipeRequestBody = BaseRequestBody;

export type DeleteBookRecipeRequest = BaseRequest<DeleteBookRecipeRequestParams & DeleteBookRecipeRequestBody>;
export type DeleteBookRecipeResponse = BaseResponse;
export type DeleteBookRecipeService = (request: DeleteBookRecipeRequest) => DeleteBookRecipeResponse;

export interface BookServices {
    deleteBook: DeleteBookService;
    deleteBookRecipe: DeleteBookRecipeService;
    getBook: GetBookService;
    getBooks: GetBooksService;
    postBook: PostBookService;
    postBookRecipe: PostBookRecipeService;
}
