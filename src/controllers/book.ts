import { v4 as Uuid } from "uuid";

import { Undefined } from "../utils";
import db, {
    book,
    Book,
    BookMember,
    bookMember,
    CreateQuery,
    CreateResponse,
    DeleteResponse,
    lamington,
    ReadQuery,
    ReadResponse,
    user,
    User,
} from "../database";

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
    accepted: BookMember["accepted"];
}

/**
 * Get all books from a user
 * @returns an array of all books created by given user
 */
const readMyBooks = async ({ userId }: GetMyBooksParams): ReadResponse<ReadBookRow> => {
    const query = db<ReadBookRow>(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.createdBy,
            `${user.firstName} as createdByName`,
            bookMember.accepted
        )
        .whereIn(
            book.bookId,
            db<string[]>(lamington.bookMember)
                .select(bookMember.bookId)
                .where({ [bookMember.userId]: userId })
        )
        .orWhere({ [book.createdBy]: userId })
        .leftJoin(lamington.user, book.createdBy, user.userId)
        .leftJoin(lamington.bookMember, book.bookId, bookMember.bookId);

    return query;
};

interface GetBookParams {
    bookId: string;
    userId: string;
}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBooks = async ({ bookId, userId }: GetBookParams): ReadResponse<ReadBookRow> => {
    // if (!Array.isArray(params)) {
    //     params = [params];
    // }
    // const bookIds = params.map(({ bookId }) => bookId);

    const query = db<ReadBookRow>(lamington.book)
        .select(book.bookId, book.name, book.description, book.createdBy, `${user.firstName} as createdByName`)
        .whereIn(
            book.bookId,
            db<string[]>(lamington.bookMember)
                .select(bookMember.bookId)
                .where({ [bookMember.userId]: userId, [bookMember.bookId]: bookId })
        )
        .orWhere({ [book.createdBy]: userId, [book.bookId]: bookId })
        .leftJoin(lamington.user, book.createdBy, user.userId);

    return query;
};

export interface CreateBookParams {
    bookId?: string;
    description: string | undefined;
    name: string;
    createdBy: string;
    memberIds?: string[];
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const createBooks = async (books: CreateQuery<CreateBookParams>): CreateResponse<Book> => {
    if (!Array.isArray(books)) {
        books = [books];
    }

    const data = books.map(({ bookId, ...params }) => ({ bookId: bookId ?? Uuid(), ...params })).filter(Undefined);

    const bookData: Book[] = data.map(({ memberIds, ...bookItem }) => bookItem);
    const memberData: BookMember[] = data.flatMap(
        ({ bookId, memberIds }) => memberIds?.map(userId => ({ bookId, userId, canEdit: "1", accepted: 0 })) ?? []
    );

    const result = await db(lamington.book).insert(bookData).onConflict(book.bookId).merge();

    const result2 = await db(lamington.bookMember)
        .whereNotIn(
            bookMember.userId,
            memberData.map(({ userId }) => userId)
        )
        .delete();

    if (memberData.length > 0) {
        const result3 = await db(lamington.bookMember)
            .insert(memberData)
            .onConflict([bookMember.bookId, bookMember.userId])
            .merge();
    }

    const bookIds = data.map(({ bookId }) => bookId);

    return db<Book>(lamington.book).select(book.bookId, book.name).whereIn(book.bookId, bookIds);
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

interface ReadBookInternalParams {
    bookId: string;
}

/**
 * Get book by id or ids
 * @returns an array of book matching given ids
 */
const readBooksInternal = async (params: ReadQuery<ReadBookInternalParams>): ReadResponse<Book> => {
    if (!Array.isArray(params)) {
        params = [params];
    }

    const bookIds = params.map(({ bookId }) => bookId);

    const query = db<Book>(lamington.book)
        .select(book.bookId, book.name, book.description, book.createdBy)
        .whereIn(book.bookId, bookIds);
    return query;
};

export const BookActions = {
    save: createBooks,
    delete: deleteBooks,
    read: readBooks,
    readMy: readMyBooks,
};

export const InternalBookActions = {
    read: readBooksInternal,
};
