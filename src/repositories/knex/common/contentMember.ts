import { EnsureArray } from "../../../utils/index.ts";
import type { ContentMember } from "../../temp.ts";
import type { User } from "../../userRepository.ts";
import type { KnexDatabase } from "../knex.ts";
import {
    ContentMemberTable,
    type CreateQuery,
    lamington,
    type ReadQuery,
    type ReadResponse,
    UserTable,
} from "../spec/index.ts";

type ContentMemberStatus = "O" | "A" | "M" | "P" | "B";

type SaveContentMemberRequest = Pick<ContentMember, "contentId"> & {
    members?: ReadonlyArray<{
        userId: ContentMember["userId"];
        status?: ContentMemberStatus;
    }>;
};

type SaveContentMemberResponse = Pick<ContentMember, "contentId"> & {
    members: Array<{
        userId: ContentMember["userId"];
        status: ContentMemberStatus | null;
        firstName: string;
    }>;
};

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

const saveContentMembers = async (
    db: KnexDatabase,
    saveRequests: CreateQuery<SaveContentMemberRequest>,
): Promise<SaveContentMemberResponse[]> => {
    const requests = EnsureArray(saveRequests);
    if (!requests.length) return [];

    const allMembersToSave = requests.flatMap(({ contentId, members = [] }) =>
        members.map(({ userId, status }) => ({ contentId, userId, status })),
    );

    if (allMembersToSave.length) {
        // Batch insert/update all members in a single query.
        await db<ContentMember>(lamington.contentMember)
            .insert(allMembersToSave)
            .onConflict(["contentId", "userId"])
            .merge(["status"]);
    }

    const savedMembers = await readContentMembers(
        db,
        requests.map(({ contentId }) => ({ contentId })),
    );

    // Group the results back by contentId to match the response format.
    return requests.map(({ contentId }) => ({
        contentId,
        members: savedMembers
            .filter((m) => m.contentId === contentId)
            .map(({ contentId: _, ...member }) => member),
    }));
};

type DeleteContentMemberParams = Pick<ContentMember, "contentId"> & {
    members: ReadonlyArray<{ userId: ContentMember["userId"] }>;
};

type DeleteContentMemberResponse = Pick<ContentMember, "contentId"> & {
    count: number;
};

const deleteContentMembers = async (
    db: KnexDatabase,
    params: CreateQuery<DeleteContentMemberParams>,
): Promise<DeleteContentMemberResponse[]> => {
    const requests = EnsureArray(params);
    const validRequests = requests.filter(
        (r) => r.members && r.members.length > 0,
    );
    if (!validRequests.length) return [];

    const deletedContentIds = await db<ContentMember>(lamington.contentMember)
        .where((builder) => {
            for (const { contentId, members } of validRequests) {
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

    return requests.map(({ contentId }) => ({
        contentId,
        count: counts[contentId] ?? 0,
    }));
};

interface GetContentMembersParams {
    contentId: string;
}

type GetContentMembersResponse = {
    contentId: ContentMember["contentId"];
    userId: ContentMember["userId"];
    status: ContentMemberStatus;
} & Pick<User, "firstName" | "lastName">;

const readContentMembers = async (
    db: KnexDatabase,
    params: ReadQuery<GetContentMembersParams>,
): ReadResponse<GetContentMembersResponse> => {
    const entityIds = EnsureArray(params).map(({ contentId }) => contentId);

    const query = await db<ContentMember>(lamington.contentMember)
        .select(
            ContentMemberTable.contentId,
            ContentMemberTable.userId,
            ContentMemberTable.status,
            UserTable.firstName,
            UserTable.lastName,
        )
        .whereIn(ContentMemberTable.contentId, entityIds)
        .leftJoin(lamington.user, ContentMemberTable.userId, UserTable.userId);

    return query.map((row) => ({ ...row, status: parseStatus(row.status) }));
};

export const ContentMemberActions = {
    delete: deleteContentMembers,
    read: readContentMembers,
    save: saveContentMembers,
};

export type ContentMemberActions = typeof ContentMemberActions;
