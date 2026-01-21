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
    preferences: string | null;
};

export const userColumns = [
    "userId",
    "email",
    "firstName",
    "lastName",
    "password",
    "createdAt",
    "updatedAt",
    "status",
    "preferences",
] as const satisfies (keyof User)[];

export const user = Object.fromEntries(
    userColumns.map(column => [column, `${lamington.user}.${column}`])
) as Table<User>;
