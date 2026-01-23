import jwt from "jsonwebtoken";

import config from "../config.ts";
import type { AuthData } from "../middleware/index.ts";

const { jwtSecret, jwtExpiration } = config.authentication;

export const createToken = (userId: string | undefined) => {
    if (!jwtSecret || !userId) return;

    const payload: AuthData = { userId };
    return jwt.sign(payload, jwtSecret, {
        noTimestamp: true,
        expiresIn: jwtExpiration as any,
    });
};
