import { lamington, Table } from "./lamington";

/**
 * List
 */
export type ListMember = {
    listId: string;
    userId: string;
    canEdit: string;
};

export const listMember: Table<ListMember> = {
    listId: `${lamington.listMember}.listId`,
    userId: `${lamington.listMember}.userId`,
    canEdit: `${lamington.listMember}.canEdit`,
} as const;
