import express from "express";

import { BookActions, CreateBookParams } from "../controllers/book";
import { AppError, MessageAction, userMessage } from "../services";
import { AuthenticatedBody } from "../middleware";
import { Recipe, ResponseBody } from "../spec";
import { User } from "./spec";

const router = express.Router();

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

interface BookRouteParams {
    bookId?: string;
}

/**
 * GET request to fetch all books for a user
 */
router.get<never, ResponseBody<Books>, AuthenticatedBody>("/", async (req, res, next) => {
    const { userId } = req.body;

    // Fetch and return result
    try {
        const results = await BookActions.readMy({ userId });
        const data: Books = Object.fromEntries(
            results.map(book => [
                book.bookId,
                { ...book, createdBy: { userId: book.createdBy, firstName: book.createdByName } },
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
});

interface GetBookResponse extends Book {
    members?: {
        [userId: string]: {
            userId: string;
            firstName?: string;
            lastName?: string;
            permissions?: string;
        };
    };
}

/**
 * GET request to fetch a book
 */
router.get<BookRouteParams, ResponseBody<GetBookResponse>, AuthenticatedBody>("/:bookId", async (req, res, next) => {
    // Extract request fields
    const { bookId } = req.params;

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
        const [book] = await BookActions.read({ bookId });
        if (!book) {
            return next(
                new AppError({
                    status: 404,
                    code: "NOT_FOUND",
                    message: "Could not find book.",
                })
            );
        }

        const bookRecipesResponse = await BookActions.readRecipes({ bookId });

        const data: GetBookResponse = {
            ...book,
            createdBy: { userId: book.createdBy, firstName: book.createdByName },
            recipes: bookRecipesResponse.filter(item => item.bookId === book.bookId).map(({ recipeId }) => recipeId),
        };

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "book" }) }));
    }
});

/**
 * POST request to create a book.
 */
router.post<BookRouteParams, ResponseBody, AuthenticatedBody<CreateBookParams>>("/", async (req, res, next) => {
    // Extract request fields
    const { userId, name, description, bookId } = req.body;

    // Check all required fields are present
    if (!name) {
        return res.status(400).json({ error: true, message: "Insufficient data to create a book." });
    }

    const book: CreateBookParams = {
        bookId,
        name,
        createdBy: userId,
        description,
    };

    // Update database and return status
    try {
        if (!bookId) {
            await BookActions.create(book);
            return res.status(201).json({ error: false, message: `Book created.` });
        } else {
            const [existingBook] = await BookActions.read({ bookId });
            if (!existingBook) {
                return res.status(403).json({
                    error: true,
                    message: "Cannot find book to edit.",
                });
            }
            if (existingBook.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    message: "You do not have permissions to edit this book",
                });
            }
            await BookActions.create(book);
            return res.status(201).json({ error: false, message: "Book updated" });
        }
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({ action: bookId ? MessageAction.Update : MessageAction.Create, entity: "book" }),
            })
        );
    }
});

/**
 * DELETE request to delete a book.
 */
router.delete<BookRouteParams, ResponseBody, AuthenticatedBody>("/:bookId", async (req, res, next) => {
    // Extract request fields
    const {
        params: { bookId },
        body: { userId },
    } = req;

    // Check all required fields are present
    if (!bookId) {
        return res.status(400).json({ error: true, message: "Insufficient data to delete a book." });
    }

    // Update database and return status
    try {
        const [existingBook] = await BookActions.read({ bookId });

        if (!existingBook) {
            return res.status(403).json({
                error: true,
                message: "Cannot find book to delete.",
            });
        }

        if (existingBook.createdBy !== userId) {
            return res.status(403).json({
                error: true,
                message: "You do not have permissions to delete this book",
            });
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
});

interface PostBookRecipeBody {
    recipeId?: string;
}

/**
 * POST request to create a book item.
 */
router.post<BookRouteParams, ResponseBody, AuthenticatedBody<PostBookRecipeBody>>(
    "/:bookId/recipes",
    async (req, res, next) => {
        // Extract request fields
        const { bookId } = req.params;

        const { recipeId, userId } = req.body;

        // Check all required fields are present
        if (!recipeId || !bookId) {
            return res.status(400).json({
                error: true,
                code: "BOOK_INSUFFICIENT_DATA",
                message: "Insufficient data to create a book recipe.",
            });
        }

        const bookRecipe = {
            bookId,
            recipeId,
        };

        // Update database and return status
        try {
            const [existingBook] = await BookActions.read({ bookId });

            if (!existingBook) {
                return res.status(403).json({
                    error: true,
                    code: "BOOK_NOT_FOUND",
                    message: "Cannot find book to add recipe to.",
                });
            }

            if (existingBook.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    code: "BOOK_NO_PERMISSIONS",
                    message: "You do not have permissions to edit this book.",
                });
            }

            await BookActions.addRecipes(bookRecipe);
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

interface DeleteBookRecipeParams extends BookRouteParams {
    recipeId?: string;
}

/**
 * DELETE request to delete a book recipe.
 */
router.delete<DeleteBookRecipeParams, ResponseBody, AuthenticatedBody>(
    "/:bookId/recipes/:recipeId",
    async (req, res, next) => {
        // Extract request fields
        const { bookId, recipeId } = req.params;

        const { userId } = req.body;

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
            const [existingBook] = await BookActions.read({ bookId });

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

            await BookActions.deleteRecipes({ bookId, recipeId });
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

export default router;
