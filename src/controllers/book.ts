import { content, type Content } from "../database/definitions/content.ts";
import { contentMember, type ContentMember } from "../database/definitions/contentMember.ts";
import db, {
    type Book,
    type CreateQuery,
    type DeleteResponse,
    type ReadMyService,
    type ReadQuery,
    type ReadResponse,
    type SaveService,
    type User,
    book,
    lamington,
    user,
} from "../database/index.ts";
import type { UserStatus } from "../routes/spec/user.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentMemberActions } from "./content/contentMember.ts";

type BookEntity = Book & Pick<Content, "createdBy">;

/**
 * Get all books
 * @returns an array of all books in the database
 */
const readAllBooks = async (): ReadResponse<BookEntity> => {
    const query = db<Book>(lamington.book)
        .select(book.bookId, book.name, content.createdBy)
        .join(lamington.content, book.bookId, content.contentId);
    return query;
};

interface GetMyBooksParams {
    userId: string;
}

interface ReadBookRow extends Pick<Book, "bookId" | "name" | "description" | "customisations"> {
    createdBy: User["userId"];
    createdByName: User["firstName"];
    status: ContentMember["status"];
}

/**
 * Get all books from a user
 * @returns an array of all books created by given user
 */
const readMyBooks: ReadMyService<ReadBookRow> = async ({ userId }) => {
    const query = db(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.customisations,
            content.createdBy,
            `${user.firstName} as createdByName`,
            contentMember.status
        )
        .where({ [content.createdBy]: userId })
        .orWhere({ [contentMember.userId]: userId })
        .leftJoin(lamington.content, book.bookId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentMember, book.bookId, contentMember.contentId);

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
    // const bookIds = EnsureArray(params).map(({ bookId }) => bookId); // TODO support multiple book ids

    const query = db(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.customisations,
            content.createdBy,
            `${user.firstName} as createdByName`,
            contentMember.status
        )
        .where({ [book.bookId]: bookId })
        .andWhere(qb => qb.where({ [content.createdBy]: userId }).orWhere({ [contentMember.userId]: userId }))
        .leftJoin(lamington.content, book.bookId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentMember, book.bookId, contentMember.contentId);

    return query;
};

export interface CreateBookParams
    extends Pick<Book, "bookId" | "name" | "description" | "customisations">,
        Pick<Content, "createdBy"> {
    members?: Array<Pick<ContentMember, "userId"> & { status?: UserStatus }>;
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const saveBooks: SaveService<CreateBookParams> = async params => {
    const books = EnsureArray(params);

    const bookData: Book[] = books.map(({ members, createdBy, ...bookItem }) => bookItem);

    // const result: BookEntity[] = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            books.map(({ bookId, createdBy }) => ({
                contentId: bookId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    // Insert books and return combined data
    const savedBooks = await db<Book>(lamington.book)
        .insert(bookData)
        .onConflict("bookId")
        .merge()
        .returning(["bookId", "name", "description", "customisations"]);

    // Get full book data with content info
    const result = await db(lamington.book)
        .select("book.*", "content.createdBy", "content.createdAt")
        .whereIn(
            "bookId",
            savedBooks.map(b => b.bookId)
        )
        .join(lamington.content, "book.bookId", "content.contentId");
    // });

    if (books.length > 0) {
        await ContentMemberActions.save(
            books.map(({ bookId, members }) => ({ contentId: bookId, members })),
            { trimNotIn: true }
        );
    }

    return result;
};

interface DeleteBookParams {
    bookId: string;
}

/**
 * Deletes books by book ids
 */
const deleteBooks = async (params: CreateQuery<DeleteBookParams>): DeleteResponse => {
    const bookIds = EnsureArray(params).map(({ bookId }) => bookId);

    await db<Book>(lamington.book).whereIn("bookId", bookIds).delete();
    return db(lamington.content).whereIn(content.contentId, bookIds).delete();
};

interface ReadBookInternalParams {
    bookId: string;
}

/**
 * Get book by id or ids
 * @returns an array of book matching given ids
 */
const readBooksInternal = async (params: ReadQuery<ReadBookInternalParams>): ReadResponse<BookEntity> => {
    const bookIds = EnsureArray(params).map(({ bookId }) => bookId);

    return db<BookEntity>(lamington.book)
        .select(book.bookId, book.name, book.description, content.createdBy)
        .whereIn(book.bookId, bookIds)
        .join(lamington.content, book.bookId, content.contentId);
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
