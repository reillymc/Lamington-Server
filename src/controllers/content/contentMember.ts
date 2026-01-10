import { contentMember, type ContentMember } from "../../database/definitions/contentMember.ts";
import {
    type CreateQuery,
    type KnexDatabase,
    type ReadQuery,
    type ReadResponse,
    type User,
    lamington,
    user,
} from "../../database/index.ts";
import { EnsureArray } from "../../utils/index.ts";

export type ContentMemberStatus = "O" | "A" | "M" | "P" | "B";

export type SaveContentMemberRequest = Pick<ContentMember, "contentId"> & {
    members?: ReadonlyArray<{ userId: ContentMember["userId"]; status?: ContentMemberStatus }>;
};

export type SaveContentMemberResponse = Pick<ContentMember, "contentId"> & {
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

export interface CreateContentMemberOptions {
    trimNotIn?: boolean;
}

const saveContentMembers = async (
    db: KnexDatabase,
    saveRequests: CreateQuery<SaveContentMemberRequest>,
    options?: CreateContentMemberOptions
): Promise<SaveContentMemberResponse[]> => {
    const requests = EnsureArray(saveRequests);
    if (!requests.length) return [];

    if (options?.trimNotIn) {
        await db<ContentMember>(lamington.contentMember)
            .where(builder => {
                for (const { contentId, members = [] } of requests) {
                    const userIdsToKeep = members.map(m => m.userId);
                    // If a book has no members to keep, all its members should be deleted.
                    if (userIdsToKeep.length === 0) {
                        builder.orWhere({ contentId });
                    } else {
                        builder.orWhere(b => b.where({ contentId }).whereNotIn("userId", userIdsToKeep));
                    }
                }
            })
            .delete();
    }

    const allMembersToSave = requests.flatMap(({ contentId, members = [] }) =>
        members.map(({ userId, status }) => ({ contentId, userId, status }))
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
        requests.map(({ contentId }) => ({ contentId }))
    );

    // Group the results back by contentId to match the response format.
    return requests.map(({ contentId }) => ({
        contentId,
        members: savedMembers.filter(m => m.contentId === contentId).map(({ contentId: _, ...member }) => member),
    }));
};

export type DeleteContentMemberParams = Pick<ContentMember, "contentId"> & {
    members: ReadonlyArray<{ userId: ContentMember["userId"] }>;
};

export type DeleteContentMemberResponse = Pick<ContentMember, "contentId"> & {
    count: number;
};

const deleteContentMembers = async (
    db: KnexDatabase,
    params: CreateQuery<DeleteContentMemberParams>
): Promise<DeleteContentMemberResponse[]> => {
    const requests = EnsureArray(params);
    const validRequests = requests.filter(r => r.members && r.members.length > 0);
    if (!validRequests.length) return [];

    const deletedContentIds = await db<ContentMember>(lamington.contentMember)
        .where(builder => {
            for (const { contentId, members } of validRequests) {
                if (!members.length) continue;

                builder.orWhere(b =>
                    b.where({ contentId }).whereIn(
                        "userId",
                        members.map(m => m.userId)
                    )
                );
            }
        })
        .delete()
        .returning("contentId");

    const counts = deletedContentIds.reduce<Record<string, number>>((acc, { contentId }) => {
        acc[contentId] = (acc[contentId] || 0) + 1;
        return acc;
    }, {});

    return requests.map(({ contentId }) => ({ contentId, count: counts[contentId] ?? 0 }));
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
    params: ReadQuery<GetContentMembersParams>
): ReadResponse<GetContentMembersResponse> => {
    const entityIds = EnsureArray(params).map(({ contentId }) => contentId);

    const query = await db<ContentMember>(lamington.contentMember)
        .select(contentMember.contentId, contentMember.userId, contentMember.status, user.firstName, user.lastName)
        .whereIn(contentMember.contentId, entityIds)
        .leftJoin(lamington.user, contentMember.userId, user.userId);

    return query.map(row => ({ ...row, status: parseStatus(row.status) }));
};

export const ContentMemberActions = {
    delete: deleteContentMembers,
    read: readContentMembers,
    save: saveContentMembers,
};

export type ContentMemberActions = typeof ContentMemberActions;
