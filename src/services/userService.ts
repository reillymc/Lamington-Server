import type { components } from "../routes/spec/index.ts";
import { SYSTEM_USER_ID } from "../utils/systemUser.ts";
import {
    type CreateService,
    NotFoundError,
    PermissionError,
} from "./service.ts";

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
}

export const createUserService: CreateService<
    UserService,
    "userRepository",
    "createUserStarterData"
> = (database, { userRepository }, { createUserStarterData }) => ({
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
});
