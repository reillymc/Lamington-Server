import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

type BookCustomisationsV1 = {
    color?: string;
    icon?: string;
};

export type BookCustomisations = BookCustomisationsV1;

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    customisations?: BookCustomisations;
    description?: string;
}

export const book: Table<Book> = {
    bookId: `${lamington.book}.bookId`,
    name: `${lamington.book}.name`,
    customisations: `${lamington.book}.customisations`,
    description: `${lamington.book}.description`,
} as const;
