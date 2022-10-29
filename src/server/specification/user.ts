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

/**
 * Users
 */
export type Users = {
    [userId: string]: User;
};
