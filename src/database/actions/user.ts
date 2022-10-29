import { v4 as Uuid } from "uuid";

import db from "../config";
import { CreateResponse, ReadResponse, user, lamington, ReadQuery, CreateQuery, User } from "../definitions";
import { Undefined } from "../helpers";

/**
 * Get all users
 * @returns an array of all users in the database
 */
const readAllUsers = async (): ReadResponse<User> => {
    const query = db<User>(lamington.user).select(user.userId, user.email, user.firstName, user.lastName, user.status);
    return query;
};

export interface GetUserParams {
    userId: string;
}

/**
 * Get users by id or ids
 * @returns an array of users matching given ids
 */
export const readUsers = async (params: ReadQuery<GetUserParams>): ReadResponse<User> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const userIds = params.map(({ userId }) => userId);

    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status, user.created)
        .whereIn(user.userId, userIds);
    return query;
};

export type CreateUserParams = {
    userId: string | undefined;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    created: string;
    status: string;
};

/**
 * Creates a new user from params
 * @returns the newly created users
 */
const createUsers = async (users: CreateQuery<CreateUserParams>): CreateResponse<User> => {
    if (!Array.isArray(users)) {
        users = [users];
    }
    const data: User[] = users.map(({ userId, ...params }) => ({ userId: userId ?? Uuid(), ...params })).filter(Undefined);

    const result = await db(lamington.user).insert(data).onConflict(user.userId).merge();

    const userIds = data.map(({ userId }) => userId);

    const query = db<User>(lamington.user).select("*").whereIn(user.userId, userIds);
    return query;
};

export interface CreateUserItemParams {
    itemId: string | undefined;
    userId: string;
    name: string;
    dateAdded: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
}

const UserActions = {
    readUsers,
    readAllUsers,
    createUsers,
};

export default UserActions;

export { readAllUsers, createUsers };

export interface ReadUserInternalParams {
    email: string;
}

/**
 * Get users by id or ids
 * @returns an array of users matching given ids
 */
export const readUsersInternal = async (params: ReadQuery<ReadUserInternalParams>): ReadResponse<User> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const userEmails = params.map(({ email }) => email);

    const query = db<User>(lamington.user)
        .select(user.userId, user.firstName, user.lastName, user.email, user.status, user.created, user.password)
        .whereIn(user.email, userEmails);
    return query;
};

const InternalUserActions = {
    readUsers: readUsersInternal,
};

export { InternalUserActions };
