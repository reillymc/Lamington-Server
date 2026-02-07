import { EnsureArray } from "../../../utils/index.ts";
import { ForeignKeyViolationError } from "../../common/errors.ts";
import type { ContentMember } from "../../temp.ts";
import type { KnexDatabase } from "../knex.ts";
import { ContentMemberTable, lamington, UserTable } from "../spec/index.ts";
import type { DynamicallyKeyedObject } from "./common.ts";
import { isForeignKeyViolation } from "./postgresErrors.ts";
import { toUndefined } from "./toUndefined.ts";

type MemberSaveItem = {
    userId: ContentMember["userId"];
    status?: ContentMemberStatus;
};

type MemberDeleteItem = {
    userId: ContentMember["userId"];
};

export type ContentMemberStatus = "O" | "A" | "M" | "P" | "B";

const parseStatus = (status?: string): ContentMemberStatus | undefined => {
    switch (status) {
        case "A":
        case "B":
        case "M":
        case "O":
        case "P":
            return status;
        default:
            return undefined;
    }
};

export const createReadMembers =
    <TableId extends "bookId" | "listId" | "plannerId">(idKey: TableId) =>
    async (
        db: KnexDatabase,
        request:
            | DynamicallyKeyedObject<TableId>
            | ReadonlyArray<DynamicallyKeyedObject<TableId>>,
    ) => {
        const requests = EnsureArray(request);
        const entityIds = requests.map((req) => req[idKey]);

        const rows = await db<ContentMember>(lamington.contentMember)
            .select(
                ContentMemberTable.contentId,
                ContentMemberTable.userId,
                ContentMemberTable.status,
                UserTable.firstName,
                UserTable.lastName,
            )
            .whereIn(ContentMemberTable.contentId, entityIds)
            .leftJoin(
                lamington.user,
                ContentMemberTable.userId,
                UserTable.userId,
            );

        const allMembers = rows.map((row) => ({
            ...row,
            status: parseStatus(row.status),
        }));

        const membersByContentId = allMembers.reduce<
            Record<string, typeof allMembers>
        >((acc, member) => {
            acc[member.contentId] = [...(acc[member.contentId] ?? []), member];
            return acc;
        }, {});

        return requests.map((req) => ({
            ...req,
            members: (membersByContentId[req[idKey]] ?? []).map(
                ({ contentId, status, ...rest }) => ({
                    ...rest,
                    status: toUndefined(status),
                }),
            ),
        }));
    };

export const createSaveMembers = <
    TableId extends "bookId" | "listId" | "plannerId",
>(
    idKey: TableId,
) => {
    const readMembers = createReadMembers(idKey);

    return async (
        db: KnexDatabase,
        request:
            | DynamicallyKeyedObject<
                  TableId,
                  { members: ReadonlyArray<MemberSaveItem> }
              >
            | ReadonlyArray<
                  DynamicallyKeyedObject<
                      TableId,
                      { members: ReadonlyArray<MemberSaveItem> }
                  >
              >,
    ) => {
        try {
            const requests = EnsureArray(request);
            if (!requests.length) return [];

            const allMembersToSave = requests.flatMap((req) => {
                const contentId = req[idKey];
                return (req.members || []).map(({ userId, status }) => ({
                    contentId,
                    userId,
                    status,
                }));
            });

            if (allMembersToSave.length) {
                await db<ContentMember>(lamington.contentMember)
                    .insert(allMembersToSave)
                    .onConflict(["contentId", "userId"])
                    .merge(["status"]);
            }

            return readMembers(db, request);
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ForeignKeyViolationError(error);
            }
            throw error;
        }
    };
};

export const createRemoveMembers =
    <TableId extends "bookId" | "listId" | "plannerId">(idKey: TableId) =>
    async (
        db: KnexDatabase,
        request:
            | DynamicallyKeyedObject<
                  TableId,
                  { members: ReadonlyArray<MemberDeleteItem> }
              >
            | ReadonlyArray<
                  DynamicallyKeyedObject<
                      TableId,
                      { members: ReadonlyArray<MemberDeleteItem> }
                  >
              >,
    ) => {
        const requests = EnsureArray(request);

        const deletedContentIds = await db<ContentMember>(
            lamington.contentMember,
        )
            .where((builder) => {
                for (const req of requests) {
                    const contentId = req[idKey];
                    const members = req.members;
                    if (!members.length) continue;

                    builder.orWhere((b) =>
                        b.where({ contentId }).whereIn(
                            "userId",
                            members.map((m) => m.userId),
                        ),
                    );
                }
            })
            .delete()
            .returning("contentId");

        const counts = deletedContentIds.reduce<Record<string, number>>(
            (acc, { contentId }) => {
                acc[contentId] = (acc[contentId] || 0) + 1;
                return acc;
            },
            {},
        );

        return requests.map(({ members, ...req }) => {
            const contentId = req[idKey];
            return { ...req, count: counts[contentId] ?? 0 };
        });
    };
