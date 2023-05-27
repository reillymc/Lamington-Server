import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import config from "../config";
import { AuthenticatedBody } from "../middleware";

const saltRounds = 10;

const { jwtSecret, jwtExpiration } = config.authentication;

export const createToken = (userId: string | undefined) => {
    if (!jwtSecret || !userId) return;

    const payload: AuthenticatedBody = { userId };
    return jwt.sign(payload, jwtSecret, { noTimestamp: true, expiresIn: jwtExpiration });
};

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password?: string, hash?: string) => {
    if (process.env.NODE_ENV === "development" && password === hash) return true;
    if (!hash || !password) return false;
    return bcrypt.compare(password, hash);
};
