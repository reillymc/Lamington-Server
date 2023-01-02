import { BaseRequestBody, BaseRequestParams, BaseResponse } from ".";
import { User } from "./user";

export const authEndpoint = "/auth" as const;
export const registerSubpath = "register" as const;
export const loginSubpath = "login" as const;

/**
 * Authorization
 */
export interface Authorization {
    token: string;
    tokenType: string;
}

export interface AuthenticationResponse {
    authorization: Authorization;
    user: Pick<User, "userId" | "email" | "firstName" | "lastName" | "status">;
}

// Register
export type RegisterRequestParams = BaseRequestParams;
export type RegisterRequestBody = Pick<User, "email" | "password" | "firstName" | "lastName">;

export type RegisterRequest = RegisterRequestBody & RegisterRequestParams;
export type RegisterResponse = BaseResponse<AuthenticationResponse>;
export type RegisterService = (request: RegisterRequest) => RegisterResponse;

// Login
export type LoginRequestParams = BaseRequestParams;
export type LoginRequestBody = BaseRequestBody<Pick<User, "email" | "password">>;

export type LoginRequest = LoginRequestBody & LoginRequestParams;
export type LoginResponse = BaseResponse<AuthenticationResponse>;
export type LoginService = (request: LoginRequest) => LoginResponse;

export interface AuthServices {
    login: LoginService;
    register: RegisterService;
}
