import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    customisations?: string;
    description?: string;
    createdBy: string;
}

export const book: Table<Book> = {
    bookId: `${lamington.book}.bookId`,
    name: `${lamington.book}.name`,
    customisations: `${lamington.book}.customisations`,
    description: `${lamington.book}.description`,
    createdBy: `${lamington.book}.createdBy`,
} as const;
