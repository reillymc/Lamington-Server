import type { KnexDatabase } from "../knex.ts";
import { ContentTable, lamington } from "../spec/index.ts";

export const createDeleteContent =
    <CollectionKey extends string, IdKey extends string>(
        collectionKey: CollectionKey,
        idKey: IdKey,
    ) =>
    async (
        db: KnexDatabase,
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
