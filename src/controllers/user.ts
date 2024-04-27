import { v4 as Uuid } from "uuid";

import db, { CreateQuery, CreateResponse, ReadQuery, ReadResponse, User, lamington, user } from "../database";
import { UserStatus } from "../routes/spec";
import { EnsureArray, Undefined } from "../utils";

/**
 * Get all users
 * @returns an array of all users in the database
 */
const readAllUsers = async (): ReadResponse<Pick<User, "userId" | "firstName" | "lastName" | "email" | "status">> => {
    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status)
        .whereNotIn(user.status, [UserStatus.Pending, UserStatus.Blacklisted]);
    return query;
};

/**
 * Get pending users
 * @returns an array of all pending users in the database
 */
const readPendingUsers = async (): ReadResponse<
    Pick<User, "userId" | "firstName" | "lastName" | "email" | "status">
> => {
    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status)
        .where(user.status, UserStatus.Pending);
    return query;
};

interface GetUserParams {
    userId: string;
}

/**
 * Get users by id or ids
 * @returns an array of users matching given ids
 */
const readUsers = async (
    params: ReadQuery<GetUserParams>
): ReadResponse<Pick<User, "userId" | "firstName" | "lastName" | "status" | "createdAt">> => {
    const users = EnsureArray(params);

    const userIds = users.map(({ userId }) => userId);

    return db<User>(lamington.user)
        .select("userId", "firstName", "lastName", "status", "createdAt")
        .whereIn("userId", userIds);
};

type CreateUserParams = {
    userId: string | undefined;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    status: UserStatus;
};

type SaveUser = Omit<User, "createdAt" | "updatedAt" | "preferences">;

/**
 * Saves a user from params
 * @returns the newly created / updated users
 */
const saveUsers = async (params: CreateQuery<CreateUserParams>): CreateResponse<User> => {
    const users: SaveUser[] = EnsureArray(params)
        .map(({ userId, ...params }) => ({ userId: userId ?? Uuid(), ...params }))
        .filter(Undefined);

    return db<User>(lamington.user).insert(users).onConflict("userId").merge().returning("userId");
};

const saveUserStatus = async (params: CreateQuery<{ userId: string; status: UserStatus }>): CreateResponse<User> => {
    const users = EnsureArray(params);

    for (const { status, userId } of users) {
        await db<User>(lamington.user).where({ userId }).update({ status });
    }

    const userIds = users.map(({ userId }) => userId);

    return db<User>(lamington.user).select("*").whereIn("userId", userIds);
};

export const UserActions = {
    read: readUsers,
    readAll: readAllUsers,
    readPending: readPendingUsers,
    save: saveUsers,
    saveStatus: saveUserStatus,
};

interface ReadUserInternalParams {
    email: string;
}

/**
 * Get users by id or ids
 * @returns an array of users matching given ids
 */
const readUsersInternal = async (params: ReadQuery<ReadUserInternalParams>): ReadResponse<User> => {
    const userEmails = EnsureArray(params).map(({ email }) => email);

    return db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status, user.createdAt, user.password)
        .whereIn(user.email, userEmails);
};

export const InternalUserActions = {
    read: readUsersInternal,
    save: saveUsers,
};
