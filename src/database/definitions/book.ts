import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    description?: string;
    customisations?: string;
    createdBy: string;
}

export const book: Table<Book> = {
    bookId: `${lamington.book}.bookId`,
    name: `${lamington.book}.name`,
    description: `${lamington.book}.description`,
    customisations: `${lamington.book}.customisations`,
    createdBy: `${lamington.book}.createdBy`,
} as const;
