import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config.ts";
import type { components } from "../routes/spec/schema.js";
import { UnauthorizedError, UnknownError } from "./logging.ts";

const {
    jwtSecret,
    jwtRefreshSecret,
    jwtAccessExpiration,
    jwtRefreshExpiration,
} = config.authentication;

type UserStatus = components["schemas"]["UserStatus"];

export const createAccessToken = (userId: string, status: UserStatus) => {
    if (!jwtSecret) {
        throw new UnknownError("No authentication secret found");
    }

    const payload: Request["session"] = { userId, status };
    return jwt.sign(payload, jwtSecret, {
        noTimestamp: true,
        expiresIn: jwtAccessExpiration as any,
    });
};

const isAccessToken = (
    decoded: string | undefined | JwtPayload,
): decoded is Request["session"] => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;
    if ("status" in decoded) return true;

    return false;
};

export const verifyAccessToken = (token: string | undefined) => {
    if (!jwtSecret) {
        throw new UnknownError("No authentication secret found");
    }

    if (!token) {
        throw new UnauthorizedError("No Token Provided");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (!isAccessToken(decoded)) {
        throw new UnauthorizedError("Invalid Token Structure");
    }

    return decoded;
};

export const createRefreshToken = (userId: string) => {
    if (!jwtRefreshSecret) {
        throw new UnknownError("No authentication refresh secret found");
    }

    const payload = { userId };
    return jwt.sign(payload, jwtRefreshSecret, {
        noTimestamp: true,
        expiresIn: jwtRefreshExpiration as any,
    });
};

const isRefreshToken = (
    decoded: string | undefined | JwtPayload,
): decoded is { userId: string } => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};

export const verifyRefreshToken = (token: string) => {
    if (!jwtRefreshSecret) {
        throw new UnknownError("No authentication refresh secret found");
    }

    const decoded = jwt.verify(token, jwtRefreshSecret);

    if (isRefreshToken(decoded)) {
        return decoded;
    }

    throw new UnauthorizedError("Invalid Token Structure");
};
