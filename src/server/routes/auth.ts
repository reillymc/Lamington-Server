import express from "express";
import bcrypt from "bcrypt";

import { AuthenticatedBody, createToken } from "../../authentication/auth";
import { ResponseBody } from "../response";
import { createUsers, InternalUserActions } from "../../database/actions/user";
import { AppError, userMessage } from "../../logging";
import { User } from "../specification";

const router = express.Router();
const saltRounds = 10;

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
router.post<never, ResponseBody<AuthenticationResponse>, AuthenticatedBody<RegisterBody>>(
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
            password: await bcrypt.hash(password, await bcrypt.genSalt(saltRounds)),
            created: new Date().toISOString().slice(0, 19).replace("T", " "),
            status: "c",
        };

        // Update database and return status
        try {
            if (!userId) {
                const [createdUser] = await createUsers(user);
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
            next(
                new AppError({
                    message: (e as Error)?.message ?? e,
                    userMessage: userMessage({ action: "registering", entity: "account" }),
                })
            );
        }
    }
);

/**
 * POST request to login an existing user
 */
router.post<never, ResponseBody<AuthenticationResponse>, AuthenticatedBody<LoginBody>>(
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
            const [user] = await InternalUserActions.readUsers({ email });
            if (!user) {
                return res.status(401).json({ error: true, message: `Invalid username of password` });
            }
            const result = await bcrypt.compare(password, user.password ?? "");

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
            next(
                new AppError({
                    message: (e as Error)?.message ?? e,
                    userMessage: userMessage({ action: "logging in to", entity: "account" }),
                })
            );
        }
    }
);

export default router;
