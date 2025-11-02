import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import config from "../config.ts";
import { UserActions } from "../controllers/index.ts";
import { getStatus } from "../routes/helpers/index.ts";
import { UserStatus } from "../routes/spec/index.ts";
import { AppError } from "../services/index.ts";

const { jwtSecret } = config.authentication;

export interface AuthData {
    userId: string;
    status?: UserStatus;
}

export const authenticationMiddleware: RequestHandler = (req, res, next) => {
    if (!jwtSecret) return;

    var token = req.headers["authorization"];
    if (!token) {
        return next(new AppError({ status: 401, message: "Authentication required to access this service." }));
    }

    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, jwtSecret, async (err, decoded) => {
        if (err) {
            return next(new AppError({ status: 401, message: "Failed to authenticate user.", innerError: err }));
        }

        if (!isUserToken(decoded)) {
            return next(new AppError({ status: 401, message: "Invalid token." }));
        }

        const [user] = await UserActions.read({ userId: decoded.userId });

        if (!user) {
            return next(new AppError({ status: 401, message: "User not found." }));
        }

        const userStatus = getStatus(user.status);

        if (userStatus === UserStatus.Pending) {
            return next(new AppError({ status: 401, message: "User account is pending approval." }));
        }

        if (userStatus === UserStatus.Blacklisted) {
            return next(new AppError({ status: 401, message: "User account access denied." }));
        }

        req.session = { userId: decoded.userId, status: userStatus };

        return next();
    });
};

const isUserToken = (decoded: string | undefined | JwtPayload): decoded is Pick<AuthData, "userId"> => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};
