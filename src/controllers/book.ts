import { v4 as Uuid } from "uuid";

import { EnsureArray, Undefined } from "../utils";
import db, {
    book,
    Book,
    BookMember,
    bookMember,
    CreateQuery,
    DeleteResponse,
    lamington,
    ReadQuery,
    ReadResponse,
    SaveService,
    user,
    User,
} from "../database";
import { EntityMember } from "./entity";
import { BookMemberActions, CreateBookMemberParams } from "./bookMember";

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
    canEdit: BookMember["canEdit"];
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
            bookMember.accepted,
            bookMember.canEdit
        )
        .where({ [book.createdBy]: userId })
        .orWhere({ [bookMember.userId]: userId })
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
        .select(
            book.bookId,
            book.name,
            book.description,
            book.createdBy,
            `${user.firstName} as createdByName`,
            bookMember.accepted,
            bookMember.canEdit
        )
        .where({ [book.bookId]: bookId })
        .andWhere(qb => qb.where({ [book.createdBy]: userId }).orWhere({ [bookMember.userId]: userId }))
        .leftJoin(lamington.user, book.createdBy, user.userId)
        .leftJoin(lamington.bookMember, book.bookId, bookMember.bookId);

    return query;
};

export interface CreateBookParams extends Pick<Book, "bookId" | "name" | "description" | "createdBy"> {
    members?: Array<EntityMember>;
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const saveBooks: SaveService<CreateBookParams> = async params => {
    const books = EnsureArray(params);

    const bookIds = books.map(({ bookId }) => bookId);

    const bookData: Book[] = books.map(({ members, ...bookItem }) => bookItem);
    const memberData: CreateBookMemberParams[] = books.flatMap(({ bookId, members }) => ({
        bookId,
        members:
            members?.map(({ userId, allowEditing }) => ({
                userId,
                allowEditing,
                accepted: false,
            })) ?? [],
    }));

    const result = await db(lamington.book).insert(bookData).onConflict(book.bookId).merge();

    await BookMemberActions.save(memberData, { preserveAccepted: true, trimNotIn: true });

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
    save: saveBooks,
    delete: deleteBooks,
    read: readBooks,
    readMy: readMyBooks,
};

export type BookActions = typeof BookActions;

export const InternalBookActions = {
    read: readBooksInternal,
    readAll: readAllBooks,
};
