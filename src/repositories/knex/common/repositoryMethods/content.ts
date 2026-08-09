import type { Knex } from "knex";
import type { Content } from "../../../temp.ts";
import { ContentTable, lamington } from "../../spec/index.ts";

export const createContentRows = async (
    db: Knex,
    createdBy: string,
    count: number,
): Promise<Array<{ contentId: string }>> =>
    db<Content>(lamington.content)
        .insert(
            Array.from({ length: count }, () => ({
                createdBy,
            })),
        )
        .returning("contentId");

export const createDeleteContent =
    <CollectionKey extends string, IdKey extends string>(
        collectionKey: CollectionKey,
        idKey: IdKey,
    ) =>
    async (
        db: Knex,
        request: Record<CollectionKey, ReadonlyArray<Record<IdKey, string>>>,
    ) => {
        const items = request[collectionKey];
        const count = await db(lamington.content)
            .whereIn(
                ContentTable.contentId,
                items.map((item) => item[idKey]),
            )
            .delete();
        return { count };
    };
