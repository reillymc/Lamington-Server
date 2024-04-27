import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse, BaseSimpleRequestBody } from ".";

export const usersEndpoint = "/users" as const;

export const approveSubpath = "approve" as const;

export const userIdParam = "userId" as const;

export enum UserStatus {
    /**
     * Owner user. A user with this status can perform any actions on a resource.
     */
    Owner = "O",

    /**
     * Administrator user. A user with this status can accept user registrations and modify a resource.
     */
    Administrator = "A",

    /**
     * Registered user. A user with this status can access a resource.
     */
    Member = "M",

    /**
     * Pending user. A user with this status has requested or been invited to become a member.
     */
    Pending = "P",

    /**
     * Banned user. A user with this status cannot access a resource.
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
export type PostUserApprovalRequestBody = BaseSimpleRequestBody<{
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
