import { Table } from ".";
import { BookCustomisations } from "../../routes/helpers";
import { lamington } from "./lamington";

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    // TODO: define this properly and handle via partials with defaults filled in in controller?
    customisations?: BookCustomisations;
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
