import type { Content } from "../../../temp.ts";
import type { KnexDatabase } from "../../knex.ts";
import { ContentTable, lamington } from "../../spec/index.ts";
import type { ContentEntity } from "./contentPermissions.ts";

export const createContentRows = async (
    db: KnexDatabase,
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
        entity: ContentEntity,
    ) =>
    async (
        db: KnexDatabase,
        request: Record<CollectionKey, ReadonlyArray<Record<IdKey, string>>>,
    ): Promise<{ count: number }> => {
        const items = request[collectionKey];
        const contentIds = items.map((item) => item[idKey]);

        if (!contentIds.length) return { count: 0 };

        const count = await db(lamington.content)
            .whereIn(ContentTable.contentId, (builder) =>
                builder
                    .select(entity.idColumn)
                    .from(entity.table)
                    .whereIn(entity.idColumn, contentIds),
            )
            .delete();

        return { count };
    };
