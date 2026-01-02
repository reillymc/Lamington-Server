import type { Book } from "../database/definitions/book.ts";
import type { Content } from "../database/definitions/content.ts";
import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Recipe } from "../database/definitions/recipe.ts";
import type { Database, User } from "../database/index.ts";
import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

type BookUserStatus = "O" | "A" | "M" | "P" | "B";

type MemberItem = {
    userId: ContentMember["userId"];
    status?: BookUserStatus;
};

type ReadFilters = {
    owner?: Content["createdBy"];
};

type ReadAllRequest = {
    userId: User["userId"];
    filter?: ReadFilters;
};

type BaseResponse = {
    bookId: Book["bookId"];
    name: Book["name"];
    description: Book["description"];
    color: string;
    icon: string;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    status?: string;
};

export type ReadAllResponse = {
    userId: User["userId"];
    filter?: ReadFilters;
    books: Array<BaseResponse>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    /**
     * Will return true of user is a member of a book with the provided statuses
     */
    status?: User["status"] | Array<User["status"]>;
    books: Array<{
        bookId: Book["bookId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status?: User["status"] | Array<User["status"]>;
    books: Array<{
        bookId: Book["bookId"];
        hasPermissions: boolean;
    }>;
};

type CreateRequest = {
    userId: User["userId"];
    books: Array<{
        name: Book["name"];
        description?: Book["description"];
        color?: string;
        icon?: string;
        members?: Array<MemberItem>;
    }>;
};

type CreateResponse = ReadResponse;

type UpdateRequest = {
    userId: User["userId"];
    books: Array<{
        bookId: Book["bookId"];
        name?: Book["name"];
        description?: Book["description"];
        color?: string;
        icon?: string;
        members?: Array<MemberItem>;
    }>;
};

type UpdateResponse = ReadResponse;

type SaveMemberRequest = MemberItem;
type ReadRequest = {
    userId: User["userId"];
    books: Array<{
        bookId: Book["bookId"];
    }>;
};

export type ReadResponse = {
    userId: User["userId"];
    books: Array<
        BaseResponse & {
            members: Array<MemberItem>;
        }
    >;
};

type DeleteRequest = {
    books: Array<{
        bookId: Book["bookId"];
    }>;
};

type DeleteResponse = {
    count: number;
};

type SaveRecipesRequest = {
    bookId: Book["bookId"];
    recipes: Array<{
        recipeId: Recipe["recipeId"];
    }>;
};

export type SaveRecipesResponse = {
    bookId: Book["bookId"];
    recipes: Array<{
        recipeId: Recipe["recipeId"];
    }>;
};

type RemoveRecipesRequest = {
    bookId: Book["bookId"];
    recipes: Array<{
        recipeId: Recipe["recipeId"];
    }>;
};

type RemoveRecipesResponse = {
    bookId: Book["bookId"];
    count: number;
};

type SaveMembersRequest = {
    bookId: Book["bookId"];
    members?: Array<SaveMemberRequest>;
};

export type SaveMembersResponse = {
    bookId: Book["bookId"];
    members: Array<MemberItem>;
};

type RemoveMembersRequest = {
    bookId: Book["bookId"];
    members: Array<{
        userId: ContentMember["userId"];
    }>;
};

type RemoveMembersResponse = {
    bookId: Book["bookId"];
    count: number;
};

type ReadMembersRequest = {
    bookId: Book["bookId"];
};

type ReadMembersResponse = {
    bookId: Book["bookId"];
    members: Array<
        MemberItem & {
            firstName: User["firstName"];
            lastName: User["lastName"];
        }
    >;
};

export interface BookRepository<TDatabase extends Database = Database> {
    read: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    readAll: RepositoryService<TDatabase, ReadAllRequest, ReadAllResponse>;
    create: RepositoryService<TDatabase, CreateRequest, CreateResponse>;
    update: RepositoryService<TDatabase, UpdateRequest, UpdateResponse>;
    delete: RepositoryService<TDatabase, DeleteRequest, DeleteResponse>;
    verifyPermissions: RepositoryService<TDatabase, VerifyPermissionsRequest, VerifyPermissionsResponse>;
    saveRecipes: RepositoryBulkService<TDatabase, SaveRecipesRequest, SaveRecipesResponse>;
    removeRecipes: RepositoryBulkService<TDatabase, RemoveRecipesRequest, RemoveRecipesResponse>;
    readMembers: RepositoryBulkService<TDatabase, ReadMembersRequest, ReadMembersResponse>;
    saveMembers: RepositoryBulkService<TDatabase, SaveMembersRequest, SaveMembersResponse>;
    removeMembers: RepositoryBulkService<TDatabase, RemoveMembersRequest, RemoveMembersResponse>;
}
