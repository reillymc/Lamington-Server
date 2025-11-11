import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Book, CreateQuery } from "../database/index.ts";
import type { UserStatus } from "../routes/spec/user.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentMemberActions, type CreateContentMemberOptions } from "./content/contentMember.ts";

type SaveBookMemberRequest = CreateQuery<{
    bookId: Book["bookId"];
    members?: Array<{ userId: ContentMember["userId"]; status?: UserStatus }>;
}>;

type DeleteBookMemberRequest = CreateQuery<{
    bookId: Book["bookId"];
    userId: ContentMember["userId"];
}>;

type ReadBookMembersRequest = CreateQuery<{
    bookId: Book["bookId"];
}>;

export const BookMemberActions = {
    delete: (request: DeleteBookMemberRequest) =>
        ContentMemberActions.delete(EnsureArray(request).map(({ bookId, userId }) => ({ contentId: bookId, userId }))),
    read: (request: ReadBookMembersRequest) =>
        ContentMemberActions.read(EnsureArray(request).map(({ bookId }) => ({ contentId: bookId }))).then(response =>
            response.map(({ contentId, ...rest }) => ({ bookId: contentId, ...rest }))
        ),
    save: (request: SaveBookMemberRequest, options?: CreateContentMemberOptions) =>
        ContentMemberActions.save(
            EnsureArray(request).map(({ bookId, members }) => ({ contentId: bookId, members })),
            options
        ),
};

export type BookMemberActions = typeof BookMemberActions;
