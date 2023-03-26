import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    description: string | undefined;
    createdBy: string;
}

export const book: Table<Book> = {
    bookId: `${lamington.book}.bookId`,
    name: `${lamington.book}.name`,
    description: `${lamington.book}.description`,
    createdBy: `${lamington.book}.createdBy`,
} as const;
