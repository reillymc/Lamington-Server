import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { UniqueViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import { SYSTEM_USER_ID } from "../utils/systemUser.ts";
import {
    CreatedDataFetchError,
    type CreateService,
    InvalidOperationError,
    NotFoundError,
    PermissionError,
    UnauthorizedError,
} from "./service.ts";

const isRefreshToken = (
    decoded: string | undefined | JwtPayload,
): decoded is { userId: string } => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;

    return false;
};

const verifyRefreshToken = (jwtRefreshSecret: string, token: string) => {
    const decoded = jwt.verify(token, jwtRefreshSecret);

    if (isRefreshToken(decoded)) {
        return decoded;
    }

    throw new UnauthorizedError("Invalid Token Structure");
};

export const createAccessToken = (
    jwtAccessSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) => jwt.sign(user, jwtAccessSecret, { noTimestamp: true, expiresIn });

const createRefreshToken = (
    jwtRefreshSecret: string,
    expiresIn: number,
    user: components["schemas"]["AuthResponse"]["user"],
) =>
    jwt.sign(user, jwtRefreshSecret, {
        noTimestamp: true,
        expiresIn,
    });

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password?: string, hash?: string) => {
    if (!hash || !password) return false;
    return bcrypt.compare(password, hash);
};

export interface UserService {
    approve(userId: string, userToApproveId: string): Promise<void>;
    blacklist(userId: string, userToBlacklistId: string): Promise<void>;
    delete(userId: string, userToDeleteId: string): Promise<void>;
    deleteProfile(userId: string): Promise<void>;

    getAll(
        userId: string,
        status?: components["schemas"]["UserStatus"],
    ): Promise<ReadonlyArray<components["schemas"]["User"]>>;
    getProfile(userId: string): Promise<components["schemas"]["User"]>;
    readCredentials(filter: { email: string } | { userId: string }): Promise<
        ReadonlyArray<{
            userId: string;
            email: string;
            password: string;
            status: components["schemas"]["UserStatus"];
        }>
    >;

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

type UserServiceConfig = {
    accessSecret: string;
    accessExpiration: number;
    refreshSecret: string;
    refreshExpiration: number;
};

export const createUserService: CreateService<
    UserService,
    "userRepository",
    "createUserStarterData",
    UserServiceConfig
> = (database, { userRepository }, { createUserStarterData }, config) => ({
    getAll: async (userId, status) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: ["A", "O"],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const { users } = await userRepository.readAll(database, {
            filter: { status },
        });
        return users.filter((u) => u.userId !== userId);
    },
    approve: async (userId, userToApproveId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: ["A", "O"],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }

        if (userToApproveId === SYSTEM_USER_ID) {
            throw new NotFoundError("user", userToApproveId);
        }

        const {
            users: [user],
        } = await userRepository.read(database, {
            users: [{ userId: userToApproveId }],
        });

        if (!user) {
            throw new NotFoundError("user", userToApproveId);
        }

        const {
            users: [updatedUser],
        } = await userRepository.update(database, {
            users: [{ userId: userToApproveId, status: "M" }],
        });

        if (user.status === "P" && updatedUser?.status === "M") {
            void createUserStarterData.run(userToApproveId);
        }
    },
    blacklist: async (userId, userToBlacklistId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: ["A", "O"],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }

        if (userToBlacklistId === SYSTEM_USER_ID) {
            throw new NotFoundError("user", userToBlacklistId);
        }

        const {
            users: [user],
        } = await userRepository.read(database, {
            users: [{ userId: userToBlacklistId }],
        });

        if (!user) {
            throw new NotFoundError("user", userToBlacklistId);
        }

        await userRepository.update(database, {
            users: [{ userId: userToBlacklistId, status: "B" }],
        });
    },
    delete: async (userId, userToDeleteId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: ["A", "O"],
            },
        );

        if (!hasPermissions) {
            throw new PermissionError("user");
        }

        if (userToDeleteId === SYSTEM_USER_ID) {
            throw new NotFoundError("user", userToDeleteId);
        }

        await userRepository.update(database, {
            users: [{ userId: userToDeleteId, status: "D" }],
        });
    },
    getProfile: async (userId) => {
        const {
            users: [user],
        } = await userRepository.read(database, { users: [{ userId }] });
        if (!user) {
            throw new NotFoundError("user", userId);
        }
        return user;
    },
    deleteProfile: async (userId) => {
        await userRepository.update(database, {
            users: [{ userId, status: "D" }],
        });
    },
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
    readCredentials: async (filter) => {
        const { users } = await userRepository.readCredentials(database, {
            users: [filter],
        });
        return users;
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
