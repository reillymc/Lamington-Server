import { lamington, Table } from ".";

/**
 * List
 */
export type ListMember = {
    listId: string;
    userId: string;
    canEdit: string | undefined;
    accepted: number | undefined;
};

export const listMember: Table<ListMember> = {
    listId: `${lamington.listMember}.listId`,
    userId: `${lamington.listMember}.userId`,
    canEdit: `${lamington.listMember}.canEdit`,
    accepted: `${lamington.listMember}.accepted`,
} as const;
