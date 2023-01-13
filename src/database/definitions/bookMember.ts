import { lamington, Table } from ".";

/**
 * BookMember
 */
export type BookMember = {
    bookId: string;
    userId: string;
    canEdit: string | undefined;
    accepted: number | undefined;
};

export const bookMember: Table<BookMember> = {
    bookId: `${lamington.bookMember}.bookId`,
    userId: `${lamington.bookMember}.userId`,
    canEdit: `${lamington.bookMember}.canEdit`,
    accepted: `${lamington.bookMember}.accepted`,
} as const;
