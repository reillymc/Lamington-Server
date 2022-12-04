import { v4 as Uuid } from "uuid";

import db, {
    CreateResponse,
    ReadResponse,
    book,
    lamington,
    ReadQuery,
    CreateQuery,
    user,
    Book,
    DeleteResponse,
    User,
    BookMeal,
    bookMeal,
} from "../database";
import { Undefined } from "../utils";

/**
 * Get all books
 * @returns an array of all books in the database
 */
const readAllBooks = async (): ReadResponse<Book> => {
    const query = db<Book>(lamington.book).select(book.bookId, book.name, book.description, book.createdBy);
    return query;
};

interface GetMyBooksParams {
    userId: string;
}

interface ReadBookRow extends Pick<Book, "bookId" | "name" | "description"> {
    createdBy: User["userId"];
    createdByName: User["firstName"];
}

/**
 * Get all books from a user
 * @returns an array of all books created by given user
 */
const readMyBooks = async ({ userId }: GetMyBooksParams): ReadResponse<ReadBookRow> => {
    const query = db<ReadBookRow>(lamington.book)
        .select(book.bookId, book.name, book.description, book.createdBy, `${user.firstName} as createdByName`)
        .where({ [book.createdBy]: userId })
        .leftJoin(lamington.user, book.createdBy, user.userId);

    return query;
};

interface GetBookParams {
    bookId: string;
}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBooks = async (params: ReadQuery<GetBookParams>): ReadResponse<ReadBookRow> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const bookIds = params.map(({ bookId }) => bookId);

    const query = db<ReadBookRow>(lamington.book)
        .select(book.bookId, book.name, book.description, book.createdBy, `${user.firstName} as createdByName`)
        .whereIn(book.bookId, bookIds)
        .leftJoin(lamington.user, book.createdBy, user.userId);

    return query;
};

interface GetBookMealsParams {
    bookId: string;
}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBookMeals = async (params: ReadQuery<GetBookMealsParams>): ReadResponse<BookMeal> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const bookIds = params.map(({ bookId }) => bookId);

    const query = db<BookMeal>(lamington.bookMeal)
        .select(bookMeal.bookId, bookMeal.mealId)
        .whereIn(bookMeal.bookId, bookIds);
    return query;
};

export interface CreateBookParams {
    bookId?: string;
    description: string | undefined;
    name: string;
    createdBy: string;
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const createBooks = async (books: CreateQuery<CreateBookParams>): CreateResponse<number> => {
    if (!Array.isArray(books)) {
        books = [books];
    }

    const data = books.map(({ bookId, ...params }) => ({ bookId: bookId ?? Uuid(), ...params })).filter(Undefined);

    const result = await db(lamington.book).insert(data).onConflict(book.bookId).merge();

    return result;
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const createBookMeals = async (bookMeals: CreateQuery<BookMeal>): CreateResponse<number> => {
    if (!Array.isArray(bookMeals)) {
        bookMeals = [bookMeals];
    }

    const result = await db(lamington.bookMeal)
        .insert(bookMeals)
        .onConflict([bookMeal.bookId, bookMeal.mealId])
        .merge();

    return result;
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const deleteBookMeals = async (bookMeals: CreateQuery<BookMeal>): DeleteResponse => {
    if (!Array.isArray(bookMeals)) {
        bookMeals = [bookMeals];
    }

    const bookIds = bookMeals.map(({ bookId }) => bookId);
    const mealIds = bookMeals.map(({ mealId }) => mealId);

    return db(lamington.bookMeal).whereIn(bookMeal.bookId, bookIds).and.whereIn(bookMeal.mealId, mealIds).delete();
};

interface DeleteBookParams {
    bookId: string;
}

/**
 * Deletes books by book ids
 */
const deleteBooks = async (books: CreateQuery<DeleteBookParams>): DeleteResponse => {
    if (!Array.isArray(books)) {
        books = [books];
    }

    const bookIds = books.map(({ bookId }) => bookId);

    return db(lamington.book).whereIn(book.bookId, bookIds).delete();
};

export const BookActions = {
    addRecipes: createBookMeals,
    create: createBooks,
    delete: deleteBooks,
    deleteRecipes: deleteBookMeals,
    read: readBooks,
    readAll: readAllBooks,
    readMy: readMyBooks,
    readRecipes: readBookMeals,
};
