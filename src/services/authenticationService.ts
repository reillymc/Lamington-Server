import { UniqueViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import { comparePassword, hashPassword } from "../utils/password.ts";
import {
    createAccessToken,
    createRefreshToken,
    verifyRefreshToken,
} from "../utils/token.ts";
import {
    CreatedDataFetchError,
    type CreateService,
    InvalidOperationError,
    UnauthorizedError,
} from "./service.ts";

export interface AuthenticationService {
    login(
        credentials: components["schemas"]["AuthLogin"],
    ): Promise<components["schemas"]["AuthResponse"]>;
    register(
        user: components["schemas"]["AuthRegister"],
    ): Promise<components["schemas"]["AuthRegisterResponse"]>;
    refresh(
        refreshToken: string,
    ): Promise<components["schemas"]["AuthResponse"]>;
}

type AuthenticationServiceConfig = {
    accessSecret: string;
    accessExpiration: number;
    refreshSecret: string;
    refreshExpiration: number;
};

export const createAuthenticationService: CreateService<
    AuthenticationService,
    "userRepository",
    never,
    AuthenticationServiceConfig
> = (database, { userRepository }, config) => ({
    register: async (user) => {
        const password = await hashPassword(user.password);
        try {
            const { users } = await userRepository.create(database, {
                users: [
                    {
                        ...user,
                        email: user.email.toLowerCase(),
                        password,
                        status: "P",
                    },
                ],
            });

            const [createdUser] = users;

            if (!createdUser) {
                throw new CreatedDataFetchError("user");
            }

            return {
                user: {
                    userId: createdUser.userId,
                    email: createdUser.email,
                    status: createdUser.status,
                },
            };
        } catch (e: unknown) {
            if (e instanceof UniqueViolationError) {
                throw new InvalidOperationError("user");
            }
            throw e;
        }
    },
    login: async ({ email, password }) => {
        const {
            users: [user],
        } = await userRepository.readCredentials(database, {
            users: [{ email }],
        });

        if (!user || user.status === "D" || user.status === "B") {
            throw new UnauthorizedError();
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            throw new UnauthorizedError();
        }

        const userPending = user.status === "P";

        return {
            authorization: {
                access: createAccessToken(
                    config.accessSecret,
                    config.accessExpiration,
                    user,
                ),
                refresh: createRefreshToken(
                    config.refreshSecret,
                    config.refreshExpiration,
                    user,
                ),
            },
            user: {
                userId: user.userId,
                email: user.email,
                status: user.status,
            },
            message: userPending ? "Account is pending approval" : undefined,
        };
    },
    refresh: async (refreshToken) => {
        let userId: string;
        try {
            const decoded = verifyRefreshToken(
                config.refreshSecret,
                refreshToken,
            );
            userId = decoded.userId;
        } catch (error) {
            throw new UnauthorizedError("Invalid Refresh Token", error);
        }

        const {
            users: [user],
        } = await userRepository.read(database, { users: [{ userId }] });

        if (!user || user.status === "B" || user.status === "D") {
            throw new UnauthorizedError("User not found");
        }

        if (user.status === "P") {
            throw new UnauthorizedError("User account access pending");
        }

        return {
            authorization: {
                access: createAccessToken(
                    config.accessSecret,
                    config.accessExpiration,
                    user,
                ),
                refresh: createRefreshToken(
                    config.refreshSecret,
                    config.refreshExpiration,
                    user,
                ),
            },
            user: {
                userId: user.userId,
                email: user.email,
                status: user.status,
            },
        };
    },
});
