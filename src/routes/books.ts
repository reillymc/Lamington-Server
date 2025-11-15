import express from "express";

import {
    BookActions,
    BookMemberActions,
    BookRecipeActions,
    InternalBookActions,
    RecipeActions,
} from "../controllers/index.ts";
import { AppError, MessageAction, userMessage } from "../services/index.ts";
import { EnsureDefinedArray, Undefined } from "../utils/index.ts";
import { prepareGetBookResponseBody, validatePostBookBody } from "./helpers/index.ts";
import {
    type Books,
    type DeleteBookMemberRequestBody,
    type DeleteBookMemberRequestParams,
    type DeleteBookMemberResponse,
    type DeleteBookRecipeRequestBody,
    type DeleteBookRecipeRequestParams,
    type DeleteBookRecipeResponse,
    type DeleteBookRequestBody,
    type DeleteBookRequestParams,
    type DeleteBookResponse,
    type GetBookRequestBody,
    type GetBookRequestParams,
    type GetBookResponse,
    type GetBooksRequestBody,
    type GetBooksRequestParams,
    type GetBooksResponse,
    type PostBookMemberRequestBody,
    type PostBookMemberRequestParams,
    type PostBookMemberResponse,
    type PostBookRecipeRequestBody,
    type PostBookRecipeRequestParams,
    type PostBookRecipeResponse,
    type PostBookRequestBody,
    type PostBookRequestParams,
    type PostBookResponse,
} from "./spec/book.ts";
import { BookEndpoint, UserStatus } from "./spec/index.ts";

const router = express.Router();

/**
 * GET request to fetch all books for a user
 */
router.get<GetBooksRequestParams, GetBooksResponse, GetBooksRequestBody>(
    BookEndpoint.getBooks,
    async ({ session }, res, next) => {
        const { userId } = session;

        // Fetch and return result
        try {
            const results = await BookActions.readMy({ userId });
            const data: Books = Object.fromEntries(
                results.map(book => [book.bookId, prepareGetBookResponseBody(book, userId)])
            );

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Read, entity: "books" }),
                })
            );
        }
    }
);

/**
 * GET request to fetch a book
 */
router.get<GetBookRequestParams, GetBookResponse, GetBookRequestBody>(
    BookEndpoint.getBook,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { bookId } = params;
        const { userId } = session;

        if (!bookId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove book member.",
                })
            );
        }

        // Fetch and return result
        try {
            const [book] = await BookActions.read({ bookId, userId });
            if (!book) {
                return next(
                    new AppError({
                        status: 404,
                        code: "NOT_FOUND",
                        message: "Could not find book.",
                    })
                );
            }

            const { result: bookRecipesResponse } = await RecipeActions.QueryByBook({ userId, bookId });
            const bookMembersResponse = await BookMemberActions.read({ bookId });

            const data = prepareGetBookResponseBody(book, userId, bookRecipesResponse, bookMembersResponse);

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "book" }) }));
        }
    }
);

/**
 * POST request to save a book.
 */
router.post<PostBookRequestParams, PostBookResponse, PostBookRequestBody>(
    BookEndpoint.postBook,
    async ({ body, session }, res, next) => {
        // Extract request fields
        const { userId } = session;
        const [validBooks, invalidBooks] = validatePostBookBody(body, userId);

        // Check all required fields are present
        if (!validBooks.length || invalidBooks.length) {
            return next(
                new AppError({
                    status: 400,
                    message: "Insufficient data to save a book.",
                })
            );
        }

        // Update database and return status
        try {
            const existingBooks = await InternalBookActions.read(validBooks);

            if (existingBooks.some(book => book.createdBy !== userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "Book_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this book.",
                    })
                );
            }

            await BookActions.save(validBooks);
            return res.status(201).json({ error: false, message: "Book saved" });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Save,
                        entity: "book",
                    }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a book.
 */
router.delete<DeleteBookRequestParams, DeleteBookResponse, DeleteBookRequestBody>(
    BookEndpoint.deleteBook,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { bookId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!bookId) {
            return next(
                new AppError({
                    status: 400,
                    message: "Insufficient data to delete a book.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingBook] = await InternalBookActions.read({ bookId });

            if (!existingBook) {
                return next(
                    new AppError({
                        status: 404,
                        message: "Cannot find book to delete.",
                    })
                );
            }

            if (existingBook.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete this book",
                    })
                );
            }

            await BookActions.delete({ bookId });
            return res.status(201).json({ error: false, message: "Book deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "book" }),
                })
            );
        }
    }
);

/**
 * POST request to save a book recipe.
 */
router.post<PostBookRecipeRequestParams, PostBookRecipeResponse, PostBookRecipeRequestBody>(
    BookEndpoint.postBookRecipe,
    async ({ body, params, session }, res, next) => {
        // Extract request fields
        const { bookId } = params;
        const recipeIds = EnsureDefinedArray(body.data)
            .map(({ recipeId }) => recipeId)
            .filter(Undefined);
        const { userId } = session;

        // Check all required fields are present
        if (!recipeIds.length || !bookId) {
            return next(
                new AppError({
                    status: 400,
                    code: "BOOK_INSUFFICIENT_DATA",
                    message: "Insufficient data to create a book recipe.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingBook] = await InternalBookActions.read({ bookId });

            if (!existingBook) {
                return next(
                    new AppError({
                        status: 404,
                        code: "BOOK_NOT_FOUND",
                        message: "Cannot find book to add recipe to.",
                    })
                );
            }

            if (existingBook.createdBy !== userId) {
                const existingBookMembers = await BookMemberActions.read({ bookId });

                if (
                    !existingBookMembers?.some(
                        member => member.userId === userId && member.status === UserStatus.Administrator
                    )
                ) {
                    return next(
                        new AppError({
                            status: 403,
                            code: "BOOK_NO_PERMISSIONS",
                            message: "You do not have permissions to edit this book.",
                        })
                    );
                }
            }

            await BookRecipeActions.save(recipeIds.map(recipeId => ({ bookId, recipeId })));
            return res.status(201).json({ error: false, message: "Book recipe added." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: bookId ? MessageAction.Update : MessageAction.Create,
                        entity: "book recipe",
                    }),
                })
            );
        }
    }
);

/**
 * POST request to update a book member. Currently only used to accept self into a book.
 */
router.post<PostBookMemberRequestParams, PostBookMemberResponse, PostBookMemberRequestBody>(
    BookEndpoint.postBookMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { bookId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!bookId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to update book member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingBook] = await InternalBookActions.read({ bookId });
            if (!existingBook) {
                return next(
                    new AppError({
                        status: 404,
                        code: "NOT_FOUND",
                        message: "Cannot find book to edit membership for.",
                    })
                );
            }

            const bookMembers = await BookMemberActions.read({ bookId });

            if (!bookMembers?.some(member => member.userId === userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You are not a member of this book.",
                    })
                );
            }

            await BookMemberActions.save({ bookId, members: [{ userId, status: UserStatus.Member }] });
            return res.status(201).json({ error: false, message: "Book member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "book member",
                    }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a book recipe.
 */
router.delete<DeleteBookRecipeRequestParams, DeleteBookRecipeResponse, DeleteBookRecipeRequestBody>(
    BookEndpoint.deleteBookRecipe,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { bookId, recipeId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!bookId || !recipeId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove book recipe.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingBook] = await InternalBookActions.read({ bookId });

            if (!existingBook) {
                return next(
                    new AppError({
                        status: 404,
                        message: "Cannot find book to delete recipe from.",
                    })
                );
            }

            if (existingBook.createdBy !== userId) {
                const existingBookMembers = await BookMemberActions.read({ bookId });

                if (
                    !existingBookMembers?.some(
                        member => member.userId === userId && member.status === UserStatus.Administrator
                    )
                ) {
                    return next(
                        new AppError({
                            status: 403,
                            code: "BOOK_NO_PERMISSIONS",
                            message: "You do not have permissions to delete recipes from this book.",
                        })
                    );
                }
            }

            await BookRecipeActions.delete({ bookId, recipeId });
            return res.status(201).json({ error: false, message: "Book item deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "book item" }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a book member.
 */
router.delete<DeleteBookMemberRequestParams, DeleteBookMemberResponse, DeleteBookMemberRequestBody>(
    BookEndpoint.deleteBookMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { bookId, userId: userToRemove } = params;
        const { userId } = session;

        const userToDelete = userToRemove || userId;

        // Check all required fields are present
        if (!userToDelete || !bookId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove book member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingBook] = await InternalBookActions.read({ bookId });
            if (!existingBook) {
                return next(
                    new AppError({
                        status: 404,
                        code: "NOT_FOUND",
                        message: "Cannot find book to remove member from.",
                    })
                );
            }

            if (existingBook.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 400,
                        code: "OWNER",
                        message: "You cannot leave a book you own.",
                    })
                );
            }

            if (userToRemove && userId !== userToRemove && existingBook.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You do not have permissions to remove book member.",
                    })
                );
            }

            await BookMemberActions.delete({ bookId, userId: userToDelete });
            return res.status(201).json({ error: false, message: "Book member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "book member",
                    }),
                })
            );
        }
    }
);

export default router;
