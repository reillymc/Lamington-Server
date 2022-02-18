import { Request, Response } from "express";
import { AuthTokenData } from "../authentication/auth";

interface BaseResponse {
    error: boolean;
    schema?: 1; // TODO make mandatory
    message?: string;
}

export type LamingtonResponse = Response<BaseResponse>;
export type LamingtonDataResponse<T> = Response<BaseResponse & { data?: T }>;

export type LamingtonRequest<T> = Request<null, null, T, null>;
export type LamingtonAuthenticatedRequest<T> = Request<null, null, T & AuthTokenData, null>;
