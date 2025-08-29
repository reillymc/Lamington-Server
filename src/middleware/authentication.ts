import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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

export const authenticationMiddleware = (
    req: Request<null, null, AuthData, null>,
    res: Response,
    next: NextFunction
) => {
    if (!jwtSecret) return;

    var token = req.headers["authorization"];
    if (!token) {
        return next(new AppError({ status: 401, message: "Authentication required to access this service." }));
    }

    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, jwtSecret, async (err, decoded: Pick<AuthData, "userId">) => {
        if (err) {
            return next(new AppError({ status: 401, message: "Failed to authenticate user.", innerError: err }));
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
