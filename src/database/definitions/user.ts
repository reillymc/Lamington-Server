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
    created: string;
    status: string;
};

export const user: Table<User> = {
    userId: `${lamington.user}.userId`,
    email: `${lamington.user}.email`,
    firstName: `${lamington.user}.firstName`,
    lastName: `${lamington.user}.lastName`,
    password: `${lamington.user}.password`,
    created: `${lamington.user}.created`,
    status: `${lamington.user}.status`,
} as const;
