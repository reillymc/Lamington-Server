import { v4 as Uuid } from "uuid";

import db, { CreateResponse, ReadResponse, user, lamington, ReadQuery, CreateQuery, User } from "../database";
import { UserStatus } from "../routes/spec";
import { Undefined } from "../utils";

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
): ReadResponse<Pick<User, "userId" | "firstName" | "lastName" | "status" | "created">> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const userIds = params.map(({ userId }) => userId);

    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.status, user.created)
        .whereIn(user.userId, userIds);
    return query;
};

type CreateUserParams = {
    userId: string | undefined;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    created: string;
    status: UserStatus;
};

/**
 * Saves a user from params
 * @returns the newly created / updated users
 */
const saveUsers = async (users: CreateQuery<CreateUserParams>): CreateResponse<User> => {
    if (!Array.isArray(users)) {
        users = [users];
    }
    const data: User[] = users
        .map(({ userId, ...params }) => ({ userId: userId ?? Uuid(), ...params }))
        .filter(Undefined);

    const result = await db(lamington.user).insert(data).onConflict(user.userId).merge();

    const userIds = data.map(({ userId }) => userId);

    const query = db<User>(lamington.user).select("*").whereIn(user.userId, userIds);
    return query;
};

const saveUserStatus = async (users: CreateQuery<{ userId: string; status: UserStatus }>): CreateResponse<User> => {
    if (!Array.isArray(users)) {
        users = [users];
    }

    for (const userRequest of users) {
        await db(lamington.user)
            .where({ [user.userId]: userRequest.userId })
            .update({
                [user.status]: userRequest.status,
            });
    }

    const userIds = users.map(({ userId }) => userId);

    const query = db<User>(lamington.user).select("*").whereIn(user.userId, userIds);
    return query;
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
    if (!Array.isArray(params)) {
        params = [params];
    }
    const userEmails = params.map(({ email }) => email);

    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status, user.created, user.password)
        .whereIn(user.email, userEmails);
    return query;
};

export const InternalUserActions = {
    read: readUsersInternal,
    save: saveUsers,
};
