import type { EntityMember } from "./entity/index.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * BookMember
 */
export type BookMember = EntityMember<{ bookId: string }>;

export const bookMember: Table<BookMember> = {
    bookId: `${lamington.bookMember}.bookId`,
    userId: `${lamington.bookMember}.userId`,
    status: `${lamington.bookMember}.status`,
} as const;
