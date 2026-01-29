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
    customisations: BookCustomisations | null;
    description: string | null;
}

export const bookColumns = [
    "bookId",
    "name",
    "customisations",
    "description",
] as const satisfies (keyof Book)[];

export const book = Object.fromEntries(
    bookColumns.map((column) => [column, `${lamington.book}.${column}`]),
) as Table<Book>;
