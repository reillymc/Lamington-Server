import type { Recipe } from "./recipeRepository.ts";
import type {
    Database,
    RepositoryBulkService,
    RepositoryService,
} from "./repository.ts";
import type { Content, ContentMember } from "./temp.ts";
import type { User } from "./userRepository.ts";

// TODO: clean up extraneous exports after migration to openapi spec at service layer is complete
type BookUserStatus = "O" | "A" | "M" | "P" | "B";
type BookIcon = `variant${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;

type BookColor = `variant${1 | 2 | 3 | 4 | 5}`;

// type BookCustomisationsV1 = {
//     color: string;
//     icon: BookUserStatus;
// };

// type BookCustomisations = BookCustomisationsV1;

/**
 * Book
 */
export interface Book {
    bookId: string;
    name: string;
    description: string | null;
}

type MemberItem = {
    userId: ContentMember["userId"];
    status: BookUserStatus | undefined;
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
    color: BookColor;
    icon: BookIcon;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    status: BookUserStatus | undefined;
};

type ReadAllResponse = {
    userId: User["userId"];
    filter: ReadFilters | undefined;
    books: ReadonlyArray<BaseResponse>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    /**
     * Will return true of user is a member of a book with the provided statuses
     */
    status: BookUserStatus | ReadonlyArray<BookUserStatus>;
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
        description?: Book["description"];
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
    members: ReadonlyArray<SaveMemberRequest> | undefined;
};

type SaveMembersResponse = {
    bookId: Book["bookId"];
    members: ReadonlyArray<MemberItem>;
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
    members: ReadonlyArray<
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
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
    saveRecipes: RepositoryBulkService<
        TDatabase,
        SaveRecipesRequest,
        SaveRecipesResponse
    >;
    removeRecipes: RepositoryBulkService<
        TDatabase,
        RemoveRecipesRequest,
        RemoveRecipesResponse
    >;
    readMembers: RepositoryBulkService<
        TDatabase,
        ReadMembersRequest,
        ReadMembersResponse
    >;
    saveMembers: RepositoryBulkService<
        TDatabase,
        SaveMembersRequest,
        SaveMembersResponse
    >;
    removeMembers: RepositoryBulkService<
        TDatabase,
        RemoveMembersRequest,
        RemoveMembersResponse
    >;
}
