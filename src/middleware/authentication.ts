import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import config from "../config";
import { userStatusToUserStatus } from "../controllers/helpers";
import { BaseResponse, UserStatus } from "../routes/spec";
import { AppError, logger } from "../services";

const { jwtSecret } = config.authentication;

interface AuthData {
    userId: string;
    status?: UserStatus;
}

type AuthenticatedBody<T = null> = T extends null ? AuthData : AuthData & T;

const authenticationMiddleware = (
    req: Request<null, null, AuthenticatedBody, null>,
    res: Response,
    next: NextFunction
) => {
    if (!jwtSecret) return;

    var token = req.headers["authorization"];
    if (!token) {
        const response: BaseResponse = { error: true, message: "Authentication required to access this service." };
        return res.status(403).send(response);
    }
    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
    }
    jwt.verify(token, jwtSecret, function (err, decoded: AuthenticatedBody) {
        if (err) {
            logger.log({
                level: "error",
                message: err.message,
                request: {
                    params: req.params,
                    query: req.query,
                    body: req.body,
                    route: req.originalUrl,
                },
            });

            return next(new AppError({ status: 400, message: "Failed to authenticate token." }));
        }

        const userStatus = userStatusToUserStatus(decoded.status as string);

        if (userStatus === UserStatus.Pending) {
            return next(new AppError({ status: 401, message: "User account is pending approval." }));
        }

        if (userStatus === UserStatus.Blacklisted) {
            return next(new AppError({ status: 401, message: "User account access denied." }));
        }

        req.body.userId = decoded.userId;
        req.body.status = userStatus;
        return next();
    });
};

export { authenticationMiddleware, AuthenticatedBody };
