import express from "express";

import { AuthenticatedBody } from "../middleware";
import { InternalUserActions } from "../controllers";
import { AppError, comparePassword, createToken, hashPassword, userMessage } from "../services";
import { BaseResponse } from "./spec";

const router = express.Router();

export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    created: string;
    status: string;
};

// Define Request Parameters
interface LoginBody {
    email: string;
    password: string;
}
interface RegisterBody extends LoginBody {
    userId?: string;
    firstName: string;
    lastName: string;
}

interface AuthenticationResponse {
    authorization: {
        token: string;
        tokenType: string;
    };
    user: Omit<User, "password" | "created">;
}

/**
 * POST request to register a new user
 */
router.post<never, BaseResponse<AuthenticationResponse>, AuthenticatedBody<RegisterBody>>(
    "/register",
    async (req, res, next) => {
        // Extract request fields
        const { userId, email, firstName, lastName, password } = req.body;

        // Check all required fields are present
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({ error: true, message: `Not enough information to create a user` });
        }

        // Create object
        const user = {
            userId,
            email,
            firstName,
            lastName,
            password: await hashPassword(password),
            created: new Date().toISOString().slice(0, 19).replace("T", " "),
            status: "c",
        };

        // Update database and return status
        try {
            if (!userId) {
                const [createdUser] = await InternalUserActions.save(user);
                const token = createToken(createdUser?.userId);
                if (!token || !createdUser) throw "Failed to create token";

                return res.status(200).json({
                    error: false,
                    data: {
                        authorization: {
                            token,
                            tokenType: "Bearer",
                        },
                        user: createdUser,
                    },
                });
            } else {
                return res.status(400).json({ error: true, message: `Cannot edit existing user :(` });
            }
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: userMessage({ action: "registering", entity: "account" }) }));
        }
    }
);

/**
 * POST request to login an existing user
 */
router.post<never, BaseResponse<AuthenticationResponse>, AuthenticatedBody<LoginBody>>(
    "/login",
    async (req, res, next) => {
        // Extract request fields
        const { email, password } = req.body;

        // Check all required fields are present
        if (!email || !password) {
            return res.status(401).json({ error: true, message: `invalid login - bad password` });
        }

        // Fetch and return data from database
        try {
            const [user] = await InternalUserActions.read({ email });
            if (!user) {
                return res.status(401).json({ error: true, message: `Invalid username of password` });
            }
            const result = await comparePassword(password, user.password);

            if (result) {
                const token = createToken(user.userId);
                if (!token) throw "Failed to create token";

                return res.status(200).json({
                    error: false,
                    data: {
                        authorization: {
                            token,
                            tokenType: "Bearer",
                        },
                        user: {
                            userId: user.userId,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            status: user.status,
                        },
                    },
                });
            }
            return res.status(401).json({ error: true, message: `invalid login - bad password` });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: userMessage({ action: "logging in to", entity: "account" }) }));
        }
    }
);

export default router;
