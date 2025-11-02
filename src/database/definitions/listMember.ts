import type { EntityMember } from "./entity/index.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ListMember
 */
export type ListMember = EntityMember<{ listId: string }>;

export const listMember: Table<ListMember> = {
    listId: `${lamington.listMember}.listId`,
    userId: `${lamington.listMember}.userId`,
    status: `${lamington.listMember}.status`,
} as const;
