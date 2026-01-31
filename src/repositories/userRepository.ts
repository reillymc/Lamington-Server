import type { Database, RepositoryService } from "./repository.ts";

type UserStatus = "O" | "A" | "M" | "P" | "B";

export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    preferences: string | null;
};

export type UserProfile = {
    userId: User["userId"];
    email: User["email"];
    firstName: User["firstName"];
    lastName: User["lastName"];
    status: UserStatus;
};

export type UserDirectoryEntry = UserProfile & {
    createdAt: User["createdAt"];
};

export type UserCredentials = {
    userId: User["userId"];
    email: User["email"];
    password: User["password"];
    status: UserStatus;
};

type ReadUsersRequest = {
    users: ReadonlyArray<{
        userId: User["userId"];
    }>;
};

type ReadUsersResponse = {
    users: ReadonlyArray<UserProfile>;
};

type ReadAllUsersRequest = {
    filter?: {
        status?: UserStatus | ReadonlyArray<UserStatus>;
    };
};

type ReadAllUsersResponse = {
    users: ReadonlyArray<UserDirectoryEntry>;
};

type ReadCredentialsRequest = {
    users: ReadonlyArray<{ userId: User["userId"] } | { email: User["email"] }>;
};

type ReadCredentialsResponse = {
    users: ReadonlyArray<UserCredentials>;
};

export type CreateUserPayload = {
    email: User["email"];
    firstName: User["firstName"];
    lastName: User["lastName"];
    password: User["password"];
    status: UserStatus;
};

type CreateUsersRequest = {
    users: ReadonlyArray<CreateUserPayload>;
};

type CreateUsersResponse = {
    users: ReadonlyArray<{
        userId: User["userId"];
        email: User["email"];
        firstName: User["firstName"];
        lastName: User["lastName"];
        password: User["password"];
        status: UserStatus;
    }>;
};

type UpdateUserPayload = {
    userId: User["userId"];
    email?: User["email"];
    firstName?: User["firstName"];
    lastName?: User["lastName"];
    password?: User["password"];
    status?: UserStatus;
};

type UpdateUsersRequest = {
    users: ReadonlyArray<UpdateUserPayload>;
};

type UpdateUsersResponse = {
    users: ReadonlyArray<UserCredentials>;
};

type DeleteUsersRequest = {
    users: ReadonlyArray<{
        userId: User["userId"];
    }>;
};

type DeleteUsersResponse = {
    count: number;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    status: UserStatus | ReadonlyArray<UserStatus>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    hasPermissions: boolean;
};

export interface UserRepository<TDatabase extends Database = Database> {
    create: RepositoryService<
        TDatabase,
        CreateUsersRequest,
        CreateUsersResponse
    >;
    delete: RepositoryService<
        TDatabase,
        DeleteUsersRequest,
        DeleteUsersResponse
    >;
    read: RepositoryService<TDatabase, ReadUsersRequest, ReadUsersResponse>;
    readAll: RepositoryService<
        TDatabase,
        ReadAllUsersRequest,
        ReadAllUsersResponse
    >;
    readCredentials: RepositoryService<
        TDatabase,
        ReadCredentialsRequest,
        ReadCredentialsResponse
    >;
    update: RepositoryService<
        TDatabase,
        UpdateUsersRequest,
        UpdateUsersResponse
    >;
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
