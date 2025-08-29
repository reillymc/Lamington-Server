import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * User
 */
export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    preferences: string;
};

export const user: Table<User> = {
    userId: `${lamington.user}.userId`,
    email: `${lamington.user}.email`,
    firstName: `${lamington.user}.firstName`,
    lastName: `${lamington.user}.lastName`,
    password: `${lamington.user}.password`,
    createdAt: `${lamington.user}.createdAt`,
    updatedAt: `${lamington.user}.updatedAt`,
    status: `${lamington.user}.status`,
    preferences: `${lamington.user}.preferences`,
} as const;
