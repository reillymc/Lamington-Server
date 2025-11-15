import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

type BookCustomisationsV1 = {
    color: string;
    icon: string;
};

export type BookCustomisations = BookCustomisationsV1;

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    // TODO: define this properly and handle via partials with defaults filled in in controller?
    customisations?: BookCustomisations;
    description?: string;
}

export const book: Table<Book> = {
    bookId: `${lamington.book}.bookId`,
    name: `${lamington.book}.name`,
    customisations: `${lamington.book}.customisations`,
    description: `${lamington.book}.description`,
} as const;
