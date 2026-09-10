import type { RepositoryMethod } from "./repository.ts";

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
    preferences: string | undefined;
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

export interface UserRepository {
    create: RepositoryMethod<CreateUsersRequest, CreateUsersResponse>;
    delete: RepositoryMethod<DeleteUsersRequest, DeleteUsersResponse>;
    read: RepositoryMethod<ReadUsersRequest, ReadUsersResponse>;
    readAll: RepositoryMethod<ReadAllUsersRequest, ReadAllUsersResponse>;
    readCredentials: RepositoryMethod<
        ReadCredentialsRequest,
        ReadCredentialsResponse
    >;
    update: RepositoryMethod<UpdateUsersRequest, UpdateUsersResponse>;
    verifyPermissions: RepositoryMethod<
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
