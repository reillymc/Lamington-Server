import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { List, CreateQuery, KnexDatabase } from "../database/index.ts";
import db from "../database/index.ts";
import type { UserStatus } from "../routes/spec/user.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentMemberActions, type CreateContentMemberOptions } from "./content/contentMember.ts";

export type SaveListMemberRequest = CreateQuery<{
    listId: List["listId"];
    members?: Array<{ userId: ContentMember["userId"]; status?: string }>;
}>;

type DeleteListMemberRequest = CreateQuery<{
    listId: List["listId"];
    userId: ContentMember["userId"];
}>;

type ReadListMembersRequest = CreateQuery<{
    listId: List["listId"];
}>;

export const ListMemberActions = {
    delete: (request: DeleteListMemberRequest) =>
        ContentMemberActions.delete(
            db as KnexDatabase,
            EnsureArray(request).map(({ listId, userId }) => ({ contentId: listId, members: [{ userId }] }))
        ),
    read: (request: ReadListMembersRequest) =>
        ContentMemberActions.read(
            db as KnexDatabase,
            EnsureArray(request).map(({ listId }) => ({ contentId: listId }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ listId: contentId, ...rest }))),
    save: (request: SaveListMemberRequest, options?: CreateContentMemberOptions) =>
        ContentMemberActions.save(
            db as KnexDatabase,
            EnsureArray(request).map(({ listId, members }) => ({ contentId: listId, members })),
            options
        ),
};

export type ListMemberActions = typeof ListMemberActions;
