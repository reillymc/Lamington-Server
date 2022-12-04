import { BaseRequestBody, BaseRequestParams, BaseResponse } from ".";

export const usersEndpoint = "/users" as const;

/**
 * Users
 */
export type Users = {
    [userId: string]: User;
};

/**
 * User
 */
export type User = {
    userId: string;
    email?: string;
    firstName: string;
    lastName: string;
    password?: string;
    created?: string;
    status?: string;
};

// Get users
export type GetUsersRequestParams = BaseRequestParams;
export type GetUsersRequestBody = BaseRequestBody;

export type GetUsersRequest = GetUsersRequestBody & GetUsersRequestParams;
export type GetUsersResponse = BaseResponse<Users>;
export type GetUsersService = (request: GetUsersRequest) => GetUsersResponse;

export interface UserServices {
    getUsers: GetUsersService;
}
