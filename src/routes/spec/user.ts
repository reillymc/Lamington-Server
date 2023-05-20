import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";

export const usersEndpoint = "/users" as const;

export const approveSubpath = "approve" as const;

export const userIdParam = "userId" as const;

export enum UserStatus {
    /**
     * Administrator user. A user with this status can accept user registrations.
     */
    Administrator = "A",

    /**
     * Registered user. A user with this status can access the application.
     */
    Registered = "R",

    /**
     * Pending user. A user with this status cannot login or access any services.
     */
    Pending = "P",

    /**
     * Banned user. A user with this status cannot login or access any services.
     */
    Blacklisted = "B",
}

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
    status?: UserStatus;
};

// Get users
export type GetUsersRequestParams = BaseRequestParams;
export type GetUsersRequestBody = BaseRequestBody;

export type GetUsersRequest = BaseRequest<GetUsersRequestBody & GetUsersRequestParams>;
export type GetUsersResponse = BaseResponse<Users>;
export type GetUsersService = (request: GetUsersRequest) => GetUsersResponse;

// Get pending users
export type GetPendingUsersRequestParams = BaseRequestParams;
export type GetPendingUsersRequestBody = BaseRequestBody;

export type GetPendingUsersRequest = BaseRequest<GetPendingUsersRequestBody & GetPendingUsersRequestParams>;
export type GetPendingUsersResponse = BaseResponse<Users>;
export type GetPendingUsersService = (request: GetPendingUsersRequest) => GetPendingUsersResponse;

// Approve user
export type PostUserApprovalRequestParams = BaseRequestParams<{ userId: string }>;
export type PostUserApprovalRequestBody = BaseRequestBody<{
    accept?: boolean;
}>;

export type PostUserApprovalRequest = BaseRequest<PostUserApprovalRequestBody & PostUserApprovalRequestParams>;
export type PostUserApprovalResponse = BaseResponse;
export type PostUserApprovalService = (request: PostUserApprovalRequest) => PostUserApprovalResponse;

export interface UserServices {
    approveUser: PostUserApprovalService;
    getPendingUsers: GetPendingUsersService;
    getUsers: GetUsersService;
}
