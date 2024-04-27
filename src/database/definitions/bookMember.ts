import { Table } from ".";
import { EntityMember } from "./entity";
import { lamington } from "./lamington";

/**
 * BookMember
 */
export type BookMember = EntityMember<{ bookId: string }>;

export const bookMember: Table<BookMember> = {
    bookId: `${lamington.bookMember}.bookId`,
    userId: `${lamington.bookMember}.userId`,
    status: `${lamington.bookMember}.status`,
} as const;
