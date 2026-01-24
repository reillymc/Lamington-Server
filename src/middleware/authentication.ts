import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { UserStatus } from "../routes/spec/user.ts";
import { UnauthorizedError, verifyAccessToken } from "../services/index.ts";
import type { CreateMiddleware } from "./middleware.ts";

const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

export const bearerAuthValidator = (request: Request): boolean => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedError();
    }
    try {
        const token = authHeader.substring(7, authHeader.length);
        const decoded = verifyAccessToken(token);

        request.session = decoded;
        return true;
    } catch (e: unknown) {
        if (e instanceof TokenExpiredError) {
            throw new UnauthorizedError("Token Expired");
        }
        if (e instanceof JsonWebTokenError) {
            throw new UnauthorizedError("Invalid Token");
        }
        if (e instanceof NotBeforeError) {
            throw new UnauthorizedError("Token Not Active");
        }
        throw e;
    }
};

export interface AuthData {
    userId: string;
    status: UserStatus;
}

// TODO: remove when rest of routes are converted
export const createAuthenticationMiddleware: CreateMiddleware<"userService"> =
    (): RequestHandler => (req, _res, next) => {
        if (req.url.startsWith("/auth")) {
            return next();
        }

        bearerAuthValidator(req);
        return next();
    };
