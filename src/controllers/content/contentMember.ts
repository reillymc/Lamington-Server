import { contentMember, type ContentMember } from "../../database/definitions/contentMember.ts";
import db, {
    type CreateQuery,
    type DeleteResponse,
    type ReadQuery,
    type ReadResponse,
    type User,
    lamington,
    user,
} from "../../database/index.ts";
import { UserStatus } from "../../routes/spec/index.ts";
import { EnsureArray } from "../../utils/index.ts";

export type SaveContentMemberRequest = Pick<ContentMember, "contentId"> & {
    members?: Array<{ userId: ContentMember["userId"]; status?: UserStatus }>;
};

export interface CreateContentMemberOptions {
    trimNotIn?: boolean;
}

const saveContentMembers = async (
    saveRequests: CreateQuery<SaveContentMemberRequest>,
    options?: CreateContentMemberOptions
) => {
    for (const { members = [], contentId } of EnsureArray(saveRequests)) {
        const data = members.map(({ status, userId }) => ({
            contentId,
            userId,
            status,
        }));

        if (options?.trimNotIn) {
            const res = await db<ContentMember>(lamington.contentMember)
                .where({ contentId })
                .whereNotIn(
                    contentMember.userId,
                    data.map(({ userId }) => userId)
                )
                .delete();
        }

        if (!data.length) return;

        await db<ContentMember>(lamington.contentMember)
            .insert(data)
            .onConflict(["contentId", "userId"])
            .merge(["status"]);
    }
};

interface DeleteContentMemberParams {
    contentId: string;
    userId: string;
}

const deleteContentMembers = async (params: CreateQuery<DeleteContentMemberParams>): DeleteResponse => {
    const entityMembers = EnsureArray(params);

    const entityIds = entityMembers.map(({ contentId }) => contentId);
    const userIds = entityMembers.map(({ userId }) => userId);

    return db<ContentMember>(lamington.contentMember)
        .whereIn("contentId", entityIds)
        .whereIn("userId", userIds)
        .delete();
};

interface GetContentMembersParams {
    contentId: string;
}

type GetContentMembersResponse = ContentMember & Pick<User, "firstName" | "lastName">;

const readContentMembers = async (
    params: ReadQuery<GetContentMembersParams>
): ReadResponse<GetContentMembersResponse> => {
    const entityIds = EnsureArray(params).map(({ contentId }) => contentId);

    const query = db<ContentMember>(lamington.contentMember)
        .select(contentMember.contentId, contentMember.userId, contentMember.status, user.firstName, user.lastName)
        .whereIn(contentMember.contentId, entityIds)
        .leftJoin(lamington.user, contentMember.userId, user.userId);

    return query;
};

export const ContentMemberActions = {
    delete: deleteContentMembers,
    read: readContentMembers,
    save: saveContentMembers,
};

export type ContentMemberActions = typeof ContentMemberActions;
