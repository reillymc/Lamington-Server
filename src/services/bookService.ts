import { UserStatus } from "../routes/spec/user.ts";
import type {
    DeleteBookMemberRequest,
    DeleteBookRecipeRequest,
    DeleteBookRequest,
    GetBookRequest,
    GetBooksRequest,
    PostBookMemberRequest,
    PostBookRecipeRequest,
    PostBookRequest,
    PutBookRequest,
    PostBookRequestBody,
    PutBookRequestBody,
} from "../routes/spec/book.ts";
import { BisectOnValidPartialItems, EnsureDefinedArray, Undefined } from "../utils/index.ts";
import type {
    ReadAllResponse,
    ReadResponse,
    SaveMembersResponse,
    SaveRecipesResponse,
} from "../repositories/bookRepository.ts";
import type { ReadAllResponse as ReadAllRecipesResponse, ReadAllRequest } from "../repositories/recipeRepository.ts";

import { type CreateService } from "./service.ts";
import { AppError } from "./logging.ts";

export interface BookService {
    get: (userId: string, request: GetBookRequest) => Promise<ReadResponse["books"][number]>;
    getAll: (userId: string, request?: GetBooksRequest) => Promise<ReadAllResponse["books"]>;
    create: (userId: string, request: PostBookRequest["data"]) => Promise<ReadResponse["books"]>;
    update: (userId: string, request: PutBookRequest["data"]) => Promise<ReadResponse["books"]>;
    delete: (userId: string, request: DeleteBookRequest) => Promise<boolean>;
    addRecipe: (
        userId: string,
        request: PostBookRecipeRequest
    ) => Promise<NonNullable<SaveRecipesResponse["recipes"]>[number]>;
    removeRecipe: (userId: string, request: DeleteBookRecipeRequest) => Promise<boolean>;
    readRecipes: (
        userId: string,
        request: { bookId: string } & Omit<ReadAllRequest, "userId"> & { filter?: { name?: string } }
    ) => Promise<ReadAllRecipesResponse>;
    joinMembership: (
        userId: string,
        request: PostBookMemberRequest
    ) => Promise<NonNullable<SaveMembersResponse["members"]>[number]>;
    leaveMembership: (userId: string, request: DeleteBookMemberRequest) => Promise<boolean>;
}

export const createBookService: CreateService<BookService, "bookRepository" | "recipeRepository"> = (
    database,
    { bookRepository, recipeRepository }
) => ({
    getAll: async (userId, params) => {
        const { books } = await bookRepository.readAll(database, { userId, filter: params });

        return books;
    },
    get: async (userId, params) => {
        const {
            books: [book],
        } = await bookRepository.read(database, { userId, books: [params] });

        if (!book) {
            throw new AppError({ status: 404, message: "Book not found" });
        }

        return book;
    },
    create: (userId, request) =>
        database.transaction(async trx => {
            // TODO: move validation to route middleware
            const [validBooks, invalidBooks] = validateCreateBookBody(request);

            if (!validBooks.length || invalidBooks.length) {
                throw new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to create book",
                });
            }

            const { books } = await bookRepository.create(trx, { userId, books: validBooks });

            return books;
        }),
    update: (userId, request) =>
        database.transaction(async trx => {
            // TODO: move validation to route middleware
            const [validBooks, invalidBooks] = validateUpdateBookBody(request);

            if (!validBooks.length || invalidBooks.length) {
                throw new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to update book",
                });
            }

            const permissions = await bookRepository.verifyPermissions(trx, { userId, books: validBooks });
            const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 403,
                    message: "You do not have permission to update one or more books",
                });
            }

            const { books } = await bookRepository.update(trx, { userId, books: validBooks });

            return books;
        }),
    delete: (userId, { bookId }) =>
        database.transaction(async trx => {
            const permissions = await bookRepository.verifyPermissions(trx, { userId, books: [{ bookId }] });

            const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 404,
                    message: `Cannot find book to delete`,
                });
            }

            const { count } = await bookRepository.delete(trx, { books: [{ bookId }] });

            if (count !== 1) {
                throw new AppError({
                    status: 500,
                    message: `Failed to delete books`,
                });
            }

            return true;
        }),
    addRecipe: (userId, { bookId, data }) =>
        database.transaction(async trx => {
            // TODO: validate at route middleware
            const validRecipes = EnsureDefinedArray(data)
                .map(({ recipeId }) => recipeId)
                .filter(Undefined)
                .map(recipeId => ({ recipeId }));

            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [{ bookId }],
                status: UserStatus.Administrator,
            });

            const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 404,
                    message: `Cannot find book to save recipe to`,
                });
            }

            const [result] = await bookRepository.saveRecipes(trx, { bookId, recipes: validRecipes });

            const [recipe] = result?.recipes ?? [];

            if (!recipe || result?.recipes.length !== validRecipes.length) {
                throw new AppError({
                    status: 500,
                    message: `Failed to save recipes to book`,
                });
            }

            return recipe;
        }),
    removeRecipe: (userId, params) =>
        database.transaction(async trx => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [params],
                status: [UserStatus.Administrator],
            });

            const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 404,
                    code: "BOOK_NOT_FOUND",
                    message: "Cannot find book to remove recipe from",
                });
            }

            const [result] = await bookRepository.removeRecipes(trx, { bookId: params.bookId, recipes: [params] });

            if (result?.count !== 1) {
                throw new AppError({
                    status: 500,
                    message: `Failed to remove recipe from book`,
                });
            }

            return true;
        }),
    joinMembership: (userId, params) =>
        database.transaction(async trx => {
            const permissions = await bookRepository.verifyPermissions(trx, {
                userId,
                books: [params],
                status: [UserStatus.Pending],
            });

            const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 404,
                    code: "BOOK_NOT_FOUND",
                    message: "Cannot find book to join",
                });
            }

            const [result] = await bookRepository.saveMembers(trx, {
                bookId: params.bookId,
                members: [{ userId, status: UserStatus.Member }],
            });

            const member = result?.members?.[0];

            if (!member || result?.members?.length !== 1) {
                throw new AppError({
                    status: 500,
                    message: `Failed to join book`,
                });
            }

            return member;
        }),
    leaveMembership: (userId, params) =>
        database.transaction(async trx => {
            const removingSelf = !params.userId || params.userId === userId;
            if (removingSelf) {
                const permissions = await bookRepository.verifyPermissions(trx, {
                    userId,
                    books: [params],
                    status: [UserStatus.Administrator, UserStatus.Member],
                });

                const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

                if (missingPermissions) {
                    throw new AppError({ status: 404, code: "BOOK_NOT_FOUND", message: "Cannot find book to leave" });
                }

                const [result] = await bookRepository.removeMembers(trx, {
                    bookId: params.bookId,
                    members: [{ userId }],
                });

                if (result?.count !== 1) {
                    throw new AppError({ status: 500, message: `Failed to leave book` });
                }
            } else {
                const permissions = await bookRepository.verifyPermissions(trx, {
                    userId,
                    books: [params],
                });

                const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

                if (missingPermissions) {
                    throw new AppError({
                        status: 404,
                        code: "BOOK_NOT_FOUND",
                        message: "Cannot find book to remove user from",
                    });
                }

                const [result] = await bookRepository.removeMembers(trx, {
                    bookId: params.bookId,
                    members: [{ userId: params.userId }],
                });

                if (result?.count !== 1) {
                    throw new AppError({ status: 500, message: `Failed to remove user from book` });
                }
            }
            return true;
        }),
    readRecipes: async (userId, { bookId, page, order, sort, filter }) => {
        const permissions = await bookRepository.verifyPermissions(database, {
            userId,
            books: [{ bookId }],
        });

        const missingPermissions = permissions.books.some(({ hasPermissions }) => !hasPermissions);

        if (missingPermissions) {
            throw new AppError({ status: 404, message: "Book not found" });
        }

        return recipeRepository.readAll(database, {
            userId,
            filter: { ...filter, books: [{ bookId }] },
            order,
            page,
            sort,
        });
    },
});

const DefaultBookColor = "variant1";
const DefaultBookIcon = "variant1";

const validateCreateBookBody = (data: PostBookRequestBody["data"]) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, item => {
        if (!item.name) return;

        return {
            name: item.name,
            description: item.description,
            color: item.color ?? DefaultBookColor,
            icon: item.icon ?? DefaultBookIcon,
            members: item.members,
        };
    });
};

const validateUpdateBookBody = (data: PutBookRequestBody["data"]) =>
    BisectOnValidPartialItems(EnsureDefinedArray(data), item => {
        if (!item.bookId) return;

        return {
            bookId: item.bookId,
            name: item.name,
            description: item.description,
            color: item.color ?? DefaultBookColor,
            icon: item.icon ?? DefaultBookIcon,
            members: item.members,
        };
    });
