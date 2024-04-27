import { Table } from ".";
import { EntityMember } from "./entity";
import { lamington } from "./lamington";

/**
 * ListMember
 */
export type ListMember = EntityMember<{ listId: string }>;

export const listMember: Table<ListMember> = {
    listId: `${lamington.listMember}.listId`,
    userId: `${lamington.listMember}.userId`,
    status: `${lamington.listMember}.status`,
} as const;
