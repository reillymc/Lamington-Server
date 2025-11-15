import express from "express";

import { InternalUserActions } from "../controllers/index.ts";
import { AppError, comparePassword, createToken, hashPassword, userMessage } from "../services/index.ts";
import { getStatus } from "./helpers/index.ts";
import {
    AuthEndpoint,
    type LoginRequestBody,
    type LoginRequestParams,
    type LoginResponse,
    type RegisterRequestBody,
    type RegisterRequestParams,
    type RegisterResponse,
    UserStatus,
} from "./spec/index.ts";
import type { AppDependencies } from "../appDependencies.ts";

export const createAuthRouter = ({ conn }: AppDependencies) => {
    const router = express.Router();

    /**
     * POST request to register a new user
     */
    router.post<RegisterRequestParams, RegisterResponse, RegisterRequestBody>(
        AuthEndpoint.register,
        async ({ body = {} }, res, next) => {
            // Extract request fields
            const { email, firstName, lastName, password } = body;

            // Check all required fields are present
            if (!email || !firstName || !lastName || !password) {
                return next(
                    new AppError({
                        status: 400,
                        message: `Not enough information to register`,
                    })
                );
            }

            // Update database and return status
            try {
                const [createdUser] = await InternalUserActions.save(conn, {
                    userId: undefined,
                    email: email.toLowerCase(),
                    firstName,
                    lastName,
                    password: await hashPassword(password),
                    status: UserStatus.Pending,
                });

                if (!createdUser) {
                    return next(new AppError({ message: userMessage({ action: "creating", entity: "account" }) }));
                }

                return res.status(200).json({
                    error: false,
                    data: {
                        user: {
                            ...createdUser,
                            status: getStatus(createdUser.status),
                        },
                    },
                });
            } catch (e: unknown) {
                next(
                    new AppError({ innerError: e, message: userMessage({ action: "registering", entity: "account" }) })
                );
            }
        }
    );

    /**
     * POST request to login an existing user
     */
    router.post<LoginRequestParams, LoginResponse, LoginRequestBody>(
        AuthEndpoint.login,
        async ({ body = {} }, res, next) => {
            // Extract request fields
            const { email, password } = body;

            // Check all required fields are present
            if (!email || !password) {
                return next(new AppError({ status: 401, message: "Invalid username or password" }));
            }

            // Fetch and return data from database
            try {
                const [user] = await InternalUserActions.read(conn, { email: email.toLowerCase() });
                if (!user) {
                    return next(
                        new AppError({
                            status: 401,
                            message: `Invalid username or password`,
                        })
                    );
                }

                const result = await comparePassword(password, user.password);

                if (result) {
                    const userPending = user.status === UserStatus.Pending;
                    const token = !userPending ? createToken(user.userId) : undefined;

                    return res.status(200).json({
                        error: false,
                        data: {
                            authorization: token
                                ? {
                                      token,
                                      tokenType: "Bearer",
                                  }
                                : undefined,
                            user: {
                                userId: user.userId,
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                status: getStatus(user.status),
                            },
                        },
                        message: userPending ? "Account is pending approval" : undefined,
                    });
                }
                next(new AppError({ status: 401, message: "Invalid username or password" }));
            } catch (e: unknown) {
                next(
                    new AppError({
                        innerError: e,
                        message: userMessage({ action: "logging in to", entity: "account" }),
                    })
                );
            }
        }
    );

    return router;
};
