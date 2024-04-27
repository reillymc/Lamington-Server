import db, {
    Book,
    BookMember,
    CreateQuery,
    DeleteResponse,
    ReadMyService,
    ReadQuery,
    ReadResponse,
    SaveService,
    User,
    book,
    bookMember,
    lamington,
    user,
} from "../database";
import { EnsureArray } from "../utils";
import { BookMemberActions } from "./bookMember";
import { EntityMember } from "./entity";

/**
 * Get all books
 * @returns an array of all books in the database
 */
const readAllBooks = async (): ReadResponse<Book> => {
    const query = db<Book>(lamington.book).select(book.bookId, book.name, book.createdBy);
    return query;
};

interface GetMyBooksParams {
    userId: string;
}

interface ReadBookRow extends Pick<Book, "bookId" | "name" | "description" | "customisations"> {
    createdBy: User["userId"];
    createdByName: User["firstName"];
    status: BookMember["status"];
}

/**
 * Get all books from a user
 * @returns an array of all books created by given user
 */
const readMyBooks: ReadMyService<ReadBookRow> = async ({ userId }) => {
    const query = db<ReadBookRow>(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.customisations,
            book.createdBy,
            `${user.firstName} as createdByName`,
            bookMember.status
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
    // const bookIds = EnsureArray(params).map(({ bookId }) => bookId); // TODO support multiple book ids

    const query = db<Book>(lamington.book)
        .select(
            book.bookId,
            book.name,
            book.description,
            book.customisations,
            book.createdBy,
            `${user.firstName} as createdByName`,
            bookMember.status
        )
        .where({ [book.bookId]: bookId })
        .andWhere(qb => qb.where({ [book.createdBy]: userId }).orWhere({ [bookMember.userId]: userId }))
        .leftJoin(lamington.user, book.createdBy, user.userId)
        .leftJoin(lamington.bookMember, book.bookId, bookMember.bookId);

    return query;
};

export interface CreateBookParams
    extends Pick<Book, "bookId" | "name" | "description" | "customisations" | "createdBy"> {
    members?: Array<EntityMember>;
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const saveBooks: SaveService<CreateBookParams> = async params => {
    const books = EnsureArray(params);

    const bookData: Book[] = books.map(({ members, ...bookItem }) => bookItem);

    const result = await db<Book>(lamington.book)
        .insert(bookData)
        .onConflict("bookId")
        .merge()
        .returning(["bookId", "name", "createdBy"]);

    if (books.length > 0) {
        await BookMemberActions.save(books, { trimNotIn: true });
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

    return db<Book>(lamington.book).whereIn("bookId", bookIds).delete();
};

interface ReadBookInternalParams {
    bookId: string;
}

/**
 * Get book by id or ids
 * @returns an array of book matching given ids
 */
const readBooksInternal = async (params: ReadQuery<ReadBookInternalParams>): ReadResponse<Book> => {
    const bookIds = EnsureArray(params).map(({ bookId }) => bookId);

    return db<Book>(lamington.book)
        .select(book.bookId, book.name, book.description, book.createdBy)
        .whereIn(book.bookId, bookIds);
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
