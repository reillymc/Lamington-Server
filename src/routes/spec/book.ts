import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse, BaseSimpleRequestBody } from ".";
import { User } from "./user";
import { Recipe, Recipes, recipeIdParam } from "./recipe";
import { EntityMember, EntityMembers } from "./common";

export const bookEndpoint = "/books" as const;

export const recipeSubpath = "recipes" as const;
export const bookMemberSubpath = "members" as const;

export const bookIdParam = "bookId" as const;
export const bookMemberIdParam = "userId" as const;

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
    description?: string;
    color?: string;
    icon?: string;
    accepted?: boolean;
    canEdit?: boolean;
    recipes?: Recipes;
    members?: EntityMembers;
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
    name: Book["name"];
    bookId: Book["bookId"];
    description?: Book["description"];
    color?: Book["color"];
    icon?: Book["icon"];
    members?: Array<EntityMember>;
    createdBy: string;
}>;

export type PostBookRequest = BaseRequest<PostBookRequestBody & PostBookRequestParams>;
export type PostBookResponse = BaseResponse;
export type PostBookService = (request: PostBookRequest) => PostBookResponse;

// Delete book
export type DeleteBookRequestParams = BaseRequestParams<{ [bookIdParam]: Book["bookId"] }>;
export type DeleteBookRequestBody = BaseSimpleRequestBody;

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
export type DeleteBookRecipeRequestBody = BaseSimpleRequestBody;

export type DeleteBookRecipeRequest = BaseRequest<DeleteBookRecipeRequestParams & DeleteBookRecipeRequestBody>;
export type DeleteBookRecipeResponse = BaseResponse;
export type DeleteBookRecipeService = (request: DeleteBookRecipeRequest) => DeleteBookRecipeResponse;

// Post book member
export type PostBookMemberRequestParams = BaseRequestParams<{
    [bookIdParam]: Book["bookId"];
}>;
export type PostBookMemberRequestBody = BaseSimpleRequestBody<Pick<Book, "accepted">>;

export type PostBookMemberRequest = BaseRequest<PostBookMemberRequestParams & PostBookMemberRequestBody>;
export type PostBookMemberResponse = BaseResponse;
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

export interface BookServices {
    deleteBook: DeleteBookService;
    deleteBookRecipe: DeleteBookRecipeService;
    getBook: GetBookService;
    getBooks: GetBooksService;
    postBook: PostBookService;
    postBookRecipe: PostBookRecipeService;
    postBookMember: PostBookMemberService;
    deleteBookMember: DeleteBookMemberService;
}
