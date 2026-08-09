import type { Recipe } from "./recipeRepository.ts";
import type { RepositoryBulkMethod, RepositoryMethod } from "./repository.ts";
import type { ContentMember } from "./temp.ts";
import type { MemberResponseItem, Owner } from "./types.ts";
import type { User } from "./userRepository.ts";

export type BookUserStatus = "O" | "A" | "M" | "P" | "B";
export type BookIcon = `variant${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;

export type BookColor = `variant${1 | 2 | 3 | 4 | 5}`;

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    description: string | undefined;
}

type MemberItem = {
    userId: ContentMember["userId"];
    status: BookUserStatus | undefined;
};

type ReadAllRequest = {
    userId: User["userId"];
};

type BaseResponse = {
    bookId: Book["bookId"];
    name: Book["name"];
    description: Book["description"];
    color: BookColor;
    icon: BookIcon;
    owner: Owner;
    status: BookUserStatus | undefined;
};

type ReadAllResponse = {
    userId: User["userId"];
    books: ReadonlyArray<BaseResponse>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    /**
     * Will return true of user is a member of a book with the provided statuses
     */
    status: BookUserStatus | [BookUserStatus, ...ReadonlyArray<BookUserStatus>];
    books: ReadonlyArray<{
        bookId: Book["bookId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status: BookUserStatus | ReadonlyArray<BookUserStatus>;
    books: ReadonlyArray<{
        bookId: Book["bookId"];
        hasPermissions: boolean;
    }>;
};

type CreateRequest = {
    userId: User["userId"];
    books: ReadonlyArray<{
        name: Book["name"];
        description?: Book["description"];
        color?: BookColor;
        icon?: BookIcon;
    }>;
};

type CreateResponse = ReadResponse;

type UpdateRequest = {
    userId: User["userId"];
    books: ReadonlyArray<{
        bookId: Book["bookId"];
        name?: Book["name"];
        description?: Book["description"] | null;
        color?: BookColor;
        icon?: BookIcon;
    }>;
};

type UpdateResponse = ReadResponse;

type SaveMemberRequest = MemberItem;
type ReadRequest = {
    userId: User["userId"];
    books: ReadonlyArray<{
        bookId: Book["bookId"];
    }>;
};

type ReadResponse = {
    userId: User["userId"];
    books: ReadonlyArray<BaseResponse>;
};

type DeleteRequest = {
    books: ReadonlyArray<{
        bookId: Book["bookId"];
    }>;
};

type DeleteResponse = {
    count: number;
};

type SaveRecipesRequest = {
    bookId: Book["bookId"];
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

type SaveRecipesResponse = {
    bookId: Book["bookId"];
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

type RemoveRecipesRequest = {
    bookId: Book["bookId"];
    recipes: ReadonlyArray<{
        recipeId: Recipe["recipeId"];
    }>;
};

type RemoveRecipesResponse = {
    bookId: Book["bookId"];
    count: number;
};

type SaveMembersRequest = {
    bookId: Book["bookId"];
    members: ReadonlyArray<SaveMemberRequest>;
};

type SaveMembersResponse = {
    bookId: Book["bookId"];
    members: ReadonlyArray<MemberResponseItem<BookUserStatus>>;
};

type RemoveMembersRequest = {
    bookId: Book["bookId"];
    members: ReadonlyArray<{
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
    members: ReadonlyArray<MemberResponseItem<BookUserStatus>>;
};

export interface BookRepository {
    read: RepositoryMethod<ReadRequest, ReadResponse>;
    readAll: RepositoryMethod<ReadAllRequest, ReadAllResponse>;
    create: RepositoryMethod<CreateRequest, CreateResponse>;
    update: RepositoryMethod<UpdateRequest, UpdateResponse>;
    delete: RepositoryMethod<DeleteRequest, DeleteResponse>;
    verifyPermissions: RepositoryMethod<
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
    saveRecipes: RepositoryBulkMethod<SaveRecipesRequest, SaveRecipesResponse>;
    removeRecipes: RepositoryBulkMethod<
        RemoveRecipesRequest,
        RemoveRecipesResponse
    >;
    readMembers: RepositoryBulkMethod<ReadMembersRequest, ReadMembersResponse>;
    saveMembers: RepositoryBulkMethod<SaveMembersRequest, SaveMembersResponse>;
    removeMembers: RepositoryBulkMethod<
        RemoveMembersRequest,
        RemoveMembersResponse
    >;
}
