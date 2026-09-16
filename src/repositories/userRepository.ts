import type { Database, RepositoryService } from "./repository.ts";

type UserStatus = "O" | "A" | "M" | "P" | "B" | "D";

export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    status: string;
    preferences: string | null;
};

type UserProfile = {
    userId: User["userId"];
    email: User["email"];
    firstName: User["firstName"];
    lastName: User["lastName"];
    status: UserStatus;
};

type UserCredentials = {
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
    users: ReadonlyArray<UserProfile>;
};

type ReadPurgeableUsersRequest = {
    deletedBefore: Date;
    limit: number;
};

type ReadPurgeableUsersResponse = {
    users: ReadonlyArray<{
        userId: User["userId"];
    }>;
};

type ReadCredentialsRequest = {
    users: ReadonlyArray<{ userId: User["userId"] } | { email: User["email"] }>;
};

type ReadCredentialsResponse = {
    users: ReadonlyArray<UserCredentials>;
};

type CreateUserPayload = {
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

type UpdateStatusPayload = {
    userId: User["userId"];
    status: Exclude<UserStatus, "D">;
};

type UpdateUserStatusRequest = {
    users: ReadonlyArray<UpdateStatusPayload>;
};

type UpdateUserStatusResponse = {
    users: ReadonlyArray<{
        userId: User["userId"];
        status: UserStatus;
    }>;
};

type SoftDeleteUserRequest = {
    users: ReadonlyArray<{
        userId: User["userId"];
    }>;
};

type SoftDeleteUserResponse = {
    count: number;
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
    readPurgeableUsers: RepositoryService<
        TDatabase,
        ReadPurgeableUsersRequest,
        ReadPurgeableUsersResponse
    >;
    updateStatus: RepositoryService<
        TDatabase,
        UpdateUserStatusRequest,
        UpdateUserStatusResponse
    >;
    softDelete: RepositoryService<
        TDatabase,
        SoftDeleteUserRequest,
        SoftDeleteUserResponse
    >;
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
