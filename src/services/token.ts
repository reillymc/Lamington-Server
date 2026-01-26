import jwt, { type JwtPayload } from "jsonwebtoken";

import config from "../config.ts";
import type { AuthData } from "../middleware/index.ts";
import type { UserStatus } from "../routes/spec/user.ts";
import { UnauthorizedError, UnknownError } from "./logging.ts";

const {
    jwtSecret,
    jwtRefreshSecret,
    jwtAccessExpiration,
    jwtRefreshExpiration,
} = config.authentication;

export const createAccessToken = (userId: string, status: UserStatus) => {
    if (!jwtSecret) {
        throw new UnknownError("No authentication secret found");
    }

    const payload: AuthData = { userId, status };
    return jwt.sign(payload, jwtSecret, {
        noTimestamp: true,
        expiresIn: jwtAccessExpiration as any,
    });
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

export const verifyAccessToken = (token: string) => {
    if (!jwtSecret) {
        throw new UnknownError("No authentication secret found");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === "string") {
        throw new UnauthorizedError("Invalid Token Structure");
    }

    if (!isAccessToken(decoded)) {
        throw new UnauthorizedError("Invalid Token Structure");
    }

    return decoded;
};

const isRefreshToken = (
    decoded: string | undefined | JwtPayload,
): decoded is { userId: string } => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};

const isAccessToken = (
    decoded: string | undefined | JwtPayload,
): decoded is AuthData => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;
    if ("status" in decoded) return true;

    return false;
};
