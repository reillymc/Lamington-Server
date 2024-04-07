import { Table } from ".";
import { lamington } from "./lamington";

/**
 * User
 */
export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    dateCreated: string;
    permissions: string;
    preferences: string;
};

export const user: Table<User> = {
    userId: `${lamington.user}.userId`,
    email: `${lamington.user}.email`,
    firstName: `${lamington.user}.firstName`,
    lastName: `${lamington.user}.lastName`,
    password: `${lamington.user}.password`,
    dateCreated: `${lamington.user}.dateCreated`,
    permissions: `${lamington.user}.permissions`,
    preferences: `${lamington.user}.preferences`,
} as const;
