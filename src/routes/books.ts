import express from "express";
import { v4 as Uuid } from "uuid";

import { AppError, MessageAction, userMessage } from "../services";
import { BookActions, BookMemberActions, BookRecipeActions, InternalBookActions, RecipeActions } from "../controllers";
import {
    Book,
    BookEndpoint,
    Books,
    DeleteBookMemberRequestBody,
    DeleteBookMemberRequestParams,
    DeleteBookMemberResponse,
    DeleteBookRecipeRequestBody,
    DeleteBookRecipeRequestParams,
    DeleteBookRecipeResponse,
    DeleteBookRequestBody,
    DeleteBookRequestParams,
    DeleteBookResponse,
    GetBookRequestBody,
    GetBookRequestParams,
    GetBookResponse,
    GetBooksRequestBody,
    GetBooksRequestParams,
    GetBooksResponse,
    PostBookMemberRequestBody,
    PostBookMemberRequestParams,
    PostBookMemberResponse,
    PostBookRecipeRequestBody,
    PostBookRecipeRequestParams,
    PostBookRecipeResponse,
    PostBookRequestBody,
    PostBookRequestParams,
    PostBookResponse,
    RequestValidator,
} from "./spec";
import { BisectOnValidPartialItems, EnsureDefinedArray, Undefined } from "../utils";

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
                results.map(book => [
                    book.bookId,
                    {
                        ...book,
                        createdBy: { userId: book.createdBy, firstName: book.createdByName },
                        accepted: book.createdBy === userId ? true : !!book.accepted,
                        canEdit: book.createdBy === userId ? true : !!book.canEdit,
                    },
                ])
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

            const { result: bookRecipesResponse } = await RecipeActions.queryByBook({ userId, bookId });
            const bookMembersResponse = await BookMemberActions.read({ entityId: bookId });

            const data: Book = {
                ...book,
                createdBy: { userId: book.createdBy, firstName: book.createdByName },
                recipes: Object.fromEntries(bookRecipesResponse.map(recipe => [recipe.recipeId, recipe])),
                members: Object.fromEntries(
                    bookMembersResponse.map(({ userId, canEdit, firstName, lastName }) => [
                        userId,
                        { userId, allowEditing: !!canEdit, firstName, lastName },
                    ])
                ),
                accepted: book.createdBy === userId ? true : !!book.accepted,
                canEdit: book.createdBy === userId ? true : !!book.canEdit,
            };

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
            const [existingBook] = await BookActions.read({ bookId, userId });

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
                        status: 404,
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
 * POST request to create a book recipe.
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
            const [existingBook] = await BookActions.read({ bookId, userId });

            if (!existingBook || existingBook.createdBy !== userId) {
                const existingBookMembers = await BookMemberActions.read({ entityId: bookId });

                if (!existingBookMembers?.some(member => member.userId === userId && member.canEdit)) {
                    return next(
                        new AppError({
                            status: 404,
                            code: "BOOK_NOT_FOUND",
                            message: "Cannot find book to add recipe to.",
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
 * POST request to update a book member.
 */
router.post<PostBookMemberRequestParams, PostBookMemberResponse, PostBookMemberRequestBody>(
    BookEndpoint.postBookMember,
    async ({ body, params, session }, res, next) => {
        // Extract request fields
        const { bookId } = params;
        const { accepted } = body;
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

            const bookMembers = await BookMemberActions.read({ entityId: bookId });

            if (!bookMembers?.some(member => member.userId === userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You are not a member of this book.",
                    })
                );
            }

            await BookMemberActions.save({ bookId, members: [{ userId, accepted }] });
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
            const [existingBook] = await BookActions.read({ bookId, userId });

            if (!existingBook) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find book to delete recipe from.",
                    })
                );
            }

            if (existingBook.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete recipes from this book",
                    })
                );
            }

            if (existingBook.createdBy !== userId) {
                const existingBookMembers = await BookMemberActions.read({ entityId: bookId });

                if (!existingBookMembers?.some(member => member.userId === userId && member.canEdit)) {
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
                        status: 403,
                        code: "NOT_FOUND",
                        message: "Cannot find book to remove member from.",
                    })
                );
            }

            if (existingBook.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 403,
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

            await BookMemberActions.delete({ entityId: bookId, userId: userToDelete });
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

const validatePostBookBody: RequestValidator<PostBookRequestBody> = ({ data }, userId) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, item => {
        if (!item.name) return;

        return {
            bookId: item.bookId ?? Uuid(),
            name: item.name,
            description: item.description,
            members: item.members,
            createdBy: userId,
        };
    });
};
