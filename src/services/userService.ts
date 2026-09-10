import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { UniqueViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createService,
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

export const createUserService = createService<
    UserService,
    "userRepository",
    "createUserStarterData",
    UserServiceConfig
>(({ userRepository }, { createUserStarterData }, config) => ({
    getAll: async (userId, status) => {
        const { hasPermissions } = await userRepository.verifyPermissions({
            userId,
            status: ["A", "O"],
        });
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const { users } = await userRepository.readAll({
            filter: { status },
        });
        return users.filter((u) => u.userId !== userId);
    },
    approve: async (userId, userToApproveId) => {
        const { hasPermissions } = await userRepository.verifyPermissions({
            userId,
            status: ["A", "O"],
        });
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const {
            users: [user],
        } = await userRepository.read({
            users: [{ userId: userToApproveId }],
        });

        if (!user) {
            throw new NotFoundError("user", userId);
        }

        const {
            users: [updatedUser],
        } = await userRepository.update({
            users: [{ userId: userToApproveId, status: "M" }],
        });

        if (user.status === "P" && updatedUser?.status === "M") {
            void createUserStarterData.run(userToApproveId);
        }
    },
    blacklist: async (userId, userToBlacklistId) => {
        const { hasPermissions } = await userRepository.verifyPermissions({
            userId,
            status: ["A", "O"],
        });
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const {
            users: [user],
        } = await userRepository.read({
            users: [{ userId: userToBlacklistId }],
        });

        if (!user) {
            throw new NotFoundError("user", userId);
        }

        await userRepository.update({
            users: [{ userId: userToBlacklistId, status: "B" }],
        });
    },
    delete: async (userId, userToDeleteId) => {
        const { hasPermissions } = await userRepository.verifyPermissions({
            userId,
            status: ["A", "O"],
        });
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        await userRepository.delete({
            users: [{ userId: userToDeleteId }],
        });
    },
    getProfile: async (userId) => {
        const {
            users: [user],
        } = await userRepository.read({ users: [{ userId }] });
        if (!user) {
            throw new NotFoundError("user", userId);
        }
        return user;
    },
    deleteProfile: async (userId) => {
        await userRepository.delete({ users: [{ userId }] });
    },
    register: async (user) => {
        const password = await hashPassword(user.password);
        try {
            const { users } = await userRepository.create({
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
        } = await userRepository.readCredentials({
            users: [{ email }],
        });

        if (!user) {
            throw new UnauthorizedError();
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            throw new UnauthorizedError();
        }

        const userPending = user.status === "P";
        const userBlacklisted = user.status === "B";

        return {
            authorization: !userBlacklisted
                ? {
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
                  }
                : undefined,
            user: {
                userId: user.userId,
                email: user.email,
                status: user.status,
            },
            message: userPending ? "Account is pending approval" : undefined,
        };
    },
    readCredentials: async (filter) => {
        const { users } = await userRepository.readCredentials({
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
        } = await userRepository.read({ users: [{ userId }] });

        if (!user) {
            throw new UnauthorizedError("User not found");
        }

        if (user.status === "B" || user.status === "P") {
            throw new UnauthorizedError("User account access denied");
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
}));
