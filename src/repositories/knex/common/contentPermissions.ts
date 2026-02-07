import { EnsureArray } from "../../../utils/index.ts";
import type { User } from "../../userRepository.ts";
import type { KnexDatabase } from "../knex.ts";
import { ContentTable, lamington } from "../spec/index.ts";
import type { DynamicallyKeyedObject } from "./common.ts";
import type { ContentMemberStatus } from "./contentMember.ts";
import { withContentReadPermissions } from "./contentQueries.ts";

export const createVerifyPermissions =
    <
        TableId extends "bookId" | "listId" | "plannerId" | "recipeId",
        CollectionKey extends "books" | "lists" | "planners" | "recipes",
    >(
        idKey: TableId,
        collectionKey: CollectionKey,
        tableName: string,
    ) =>
    async (
        db: KnexDatabase,
        params: {
            userId: User["userId"];
            /**
             * Will return true of user is a member of a planner with the provided statuses
             */
            status: ContentMemberStatus | ReadonlyArray<ContentMemberStatus>;
        } & Record<
            CollectionKey,
            ReadonlyArray<DynamicallyKeyedObject<TableId>>
        >,
    ): Promise<
        {
            userId: User["userId"];
            /**
             * Will return true of user is a member of a planner with the provided statuses
             */
            status: ContentMemberStatus | ReadonlyArray<ContentMemberStatus>;
        } & Record<
            CollectionKey,
            ReadonlyArray<
                DynamicallyKeyedObject<TableId, { hasPermissions: boolean }>
            >
        >
    > => {
        const { userId, status } = params;
        const items = EnsureArray(params[collectionKey]);

        const statuses = EnsureArray(status);
        const memberStatuses = statuses.filter((s) => s !== "O");

        const owners: any[] = await db(tableName)
            .select(idKey)
            .leftJoin(lamington.content, ContentTable.contentId, idKey)
            .whereIn(
                idKey,
                items.map((item) => item[idKey]),
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: idKey,
                    allowedStatuses: memberStatuses,
                    ownerColumns: statuses.includes("O") ? undefined : [],
                }),
            );

        const permissionMap = Object.fromEntries(
            owners.map((o) => [o[idKey], true]),
        );

        const dynamicObject = {
            [collectionKey]: items.map((item) => ({
                [idKey]: item[idKey],
                hasPermissions: permissionMap[item[idKey]] ?? false,
            })),
        } as Record<
            CollectionKey,
            Array<DynamicallyKeyedObject<TableId, { hasPermissions: boolean }>>
        >;

        return {
            ...params,
            status: params.status ?? [],
            ...dynamicObject,
        };
    };
