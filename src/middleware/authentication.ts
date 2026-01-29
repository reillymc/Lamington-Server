import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import config from "../config.ts";
import type { components } from "../routes/spec/schema.ts";
import { UnauthorizedError, UnknownError } from "../services/index.ts";
import type { CreateMiddleware } from "./middleware.ts";

const { jwtSecret } = config.authentication;

type UserStatus = components["schemas"]["UserStatus"];

export const getStatus = (
    status: string | undefined,
    isOwner?: boolean,
): UserStatus | undefined => {
    if (isOwner) return "O";

    switch (status) {
        case "A":
        case "M":
        case "B":
        case "P":
            return status;
        default:
            return undefined;
    }
};

export interface AuthData {
    userId: string;
    status?: UserStatus;
}

export const createAuthenticationMiddleware: CreateMiddleware<"userService"> =
    ({ userService }): RequestHandler =>
    (req, _res, next) => {
        if (!jwtSecret) {
            return next(new UnknownError("No authentication secret found"));
        }

        // TODO remove route check when rest of routes are converted adn can be properly sequenced
        if (req.url.startsWith("/auth")) {
            return next();
        }

        var token = req.headers.authorization;
        if (!token) {
            return next(new UnauthorizedError());
        }

        if (token.startsWith("Bearer ")) {
            token = token.slice(7, token.length);
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return next(
                    new UnauthorizedError(
                        "Failed to decode authentication token",
                    ),
                );
            }

            if (!isUserToken(decoded)) {
                return next(new UnauthorizedError("Invalid token"));
            }

            const [user] = await userService.readCredentials(decoded);

            if (!user) {
                return next(new UnauthorizedError("User not found"));
            }

            const userStatus = getStatus(user.status);

            if (userStatus === "P") {
                return next(
                    new UnauthorizedError("User account is pending approval"),
                );
            }

            if (userStatus === "B") {
                return next(
                    new UnauthorizedError("User account access denied"),
                );
            }

            req.session = { userId: decoded.userId, status: userStatus };

            return next();
        });
    };

const isUserToken = (
    decoded: string | undefined | JwtPayload,
): decoded is Pick<AuthData, "userId"> => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};
