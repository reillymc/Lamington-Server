import jwt, { type JwtPayload } from "jsonwebtoken";

import type { components } from "../routes/spec/index.ts";
import { UnauthorizedError } from "../services/service.ts";

type UserStatus = components["schemas"]["UserStatus"];

interface AuthData {
    userId: string;
    status: UserStatus;
}

const isAccessToken = (
    decoded: string | undefined | JwtPayload,
): decoded is AuthData => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded && "status" in decoded) return true;

    return false;
};

const isRefreshToken = (
    decoded: string | undefined | JwtPayload,
): decoded is { userId: string } => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};

const toTokenPayload = (
    user: components["schemas"]["AuthResponse"]["user"],
) => ({
    userId: user.userId,
    email: user.email,
    status: user.status,
});

export const createAccessToken = (
    jwtAccessSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) =>
    jwt.sign(toTokenPayload(user), jwtAccessSecret, {
        noTimestamp: true,
        expiresIn,
    });

export const createRefreshToken = (
    jwtRefreshSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) =>
    jwt.sign(toTokenPayload(user), jwtRefreshSecret, {
        noTimestamp: true,
        expiresIn,
    });

export const verifyAccessToken = (
    jwtAccessSecret: string,
    token: string | undefined,
): AuthData => {
    if (!token) {
        throw new UnauthorizedError("No Token Provided");
    }

    const decoded = jwt.verify(token, jwtAccessSecret);

    if (!isAccessToken(decoded)) {
        throw new UnauthorizedError("Invalid Token Structure");
    }

    return decoded;
};

export const verifyRefreshToken = (jwtRefreshSecret: string, token: string) => {
    const decoded = jwt.verify(token, jwtRefreshSecret);

    if (isRefreshToken(decoded)) {
        return decoded;
    }

    throw new UnauthorizedError("Invalid Token Structure");
};
