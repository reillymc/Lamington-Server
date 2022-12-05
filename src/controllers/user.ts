import { v4 as Uuid } from "uuid";

import db, { CreateResponse, ReadResponse, user, lamington, ReadQuery, CreateQuery, User } from "../database";
import { Undefined } from "../utils";

/**
 * Get all users
 * @returns an array of all users in the database
 */
const readAllUsers = async (): ReadResponse<Pick<User, "userId" | "firstName" | "lastName">> => {
    const query = db<User>(lamington.user).select(user.userId, user.firstName, user.lastName);
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
    const data: User[] = users
        .map(({ userId, ...params }) => ({ userId: userId ?? Uuid(), ...params }))
        .filter(Undefined);

    const result = await db(lamington.user).insert(data).onConflict(user.userId).merge();

    const userIds = data.map(({ userId }) => userId);

    const query = db<User>(lamington.user).select("*").whereIn(user.userId, userIds);
    return query;
};

interface CreateUserItemParams {
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

export const UserActions = {
    read: readUsers,
    readAll: readAllUsers,
    create: createUsers,
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
    save: createUsers,
};
