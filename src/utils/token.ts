import jwt, { type JwtPayload } from "jsonwebtoken";

import type { components } from "../routes/spec/index.ts";
import { UnauthorizedError } from "./errors.ts";

type UserStatus = components["schemas"]["UserStatus"];

interface AuthData {
    userId: string;
    status: UserStatus;
    tokenUse: "access";
}

interface RefreshData {
    userId: string;
    tokenUse: "refresh";
}

const isAccessToken = (
    decoded: string | undefined | JwtPayload,
): decoded is AuthData => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if (
        "userId" in decoded &&
        "status" in decoded &&
        "tokenUse" in decoded &&
        decoded.tokenUse === "access"
    )
        return true;

    return false;
};

const isRefreshToken = (
    decoded: string | undefined | JwtPayload,
): decoded is RefreshData => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if (
        "userId" in decoded &&
        "tokenUse" in decoded &&
        decoded.tokenUse === "refresh"
    )
        return true;

    return false;
};

const toTokenPayload = (
    user: components["schemas"]["AuthResponse"]["user"],
    tokenUse: "access" | "refresh",
) => ({
    userId: user.userId,
    email: user.email,
    status: user.status,
    tokenUse,
});

export const createAccessToken = (
    jwtAccessSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) =>
    jwt.sign(toTokenPayload(user, "access"), jwtAccessSecret, {
        noTimestamp: true,
        expiresIn,
    });

export const createRefreshToken = (
    jwtRefreshSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) =>
    jwt.sign(toTokenPayload(user, "refresh"), jwtRefreshSecret, {
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
