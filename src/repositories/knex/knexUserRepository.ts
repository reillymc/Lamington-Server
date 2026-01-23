import { user, userColumns } from "../../database/definitions/user.ts";
import { type KnexDatabase, lamington } from "../../database/index.ts";
import { UserStatus } from "../../routes/spec/index.ts";
import { EnsureArray, Undefined } from "../../utils/index.ts";
import { UniqueViolationError } from "../common/errors.ts";
import type { UserRepository } from "../userRepository.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";
import { isUniqueViolation } from "./common/postgresErrors.ts";

export const KnexUserRepository: UserRepository<KnexDatabase> = {
    read: async (db, { users }) => {
        const userIds = users.map((u) => u.userId);
        const result = await db(lamington.user)
            .select(
                user.userId,
                user.email,
                user.firstName,
                user.lastName,
                user.status,
                user.createdAt,
            )
            .whereIn(user.userId, userIds);

        return {
            users: result.map((u) => ({
                userId: u.userId,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                status: u.status,
                createdAt: u.createdAt,
            })),
        };
    },
    readAll: async (db, { filter }) => {
        const query = db(lamington.user).select(
            user.userId,
            user.firstName,
            user.lastName,
            user.email,
            user.status,
            user.createdAt,
        );

        if (filter?.status) {
            query.whereIn(user.status, EnsureArray(filter.status));
        } else {
            query.whereNotIn(user.status, [
                UserStatus.Pending,
                UserStatus.Blacklisted,
            ]);
        }

        const result = await query;

        return {
            users: result.map((u) => ({
                userId: u.userId,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                status: u.status,
                createdAt: u.createdAt,
            })),
        };
    },
    readCredentials: async (db, { users }) => {
        const emails = users
            .map((u) => ("email" in u ? u.email : undefined))
            .filter(Undefined);
        const userIds = users
            .map((u) => ("userId" in u ? u.userId : undefined))
            .filter(Undefined);

        if (emails.length === 0 && userIds.length === 0) {
            return { users: [] };
        }

        const result = await db(lamington.user)
            .select(
                user.userId,
                user.firstName,
                user.lastName,
                user.email,
                user.status,
                user.createdAt,
                user.password,
            )
            .where((builder) => {
                if (emails.length > 0) builder.orWhereIn(user.email, emails);
                if (userIds.length > 0) builder.orWhereIn(user.userId, userIds);
            });

        return {
            users: result.map((u) => ({
                userId: u.userId,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                status: u.status,
                createdAt: u.createdAt,
                password: u.password,
            })),
        };
    },
    create: async (db, { users }) => {
        const usersToCreate = users.map((u) => ({
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            password: u.password,
            status: u.status,
        }));

        if (usersToCreate.length === 0) {
            return { users: [] };
        }

        try {
            const createdUsers = await db(lamington.user)
                .insert(usersToCreate)
                .returning("*");

            return {
                users: createdUsers.map((u) => ({
                    userId: u.userId,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    status: u.status,
                    createdAt: u.createdAt,
                    password: u.password,
                })),
            };
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new UniqueViolationError(error);
            }
            throw error;
        }
    },
    update: async (db, { users }) => {
        for (const u of users) {
            const updateData = buildUpdateRecord(u, userColumns);

            if (updateData) {
                await db(lamington.user)
                    .where(user.userId, u.userId)
                    .update(updateData);
            }
        }

        const userIds = users.map((u) => u.userId);
        const updatedUsers = await db(lamington.user)
            .select([user.userId, user.status])
            .whereIn(user.userId, userIds);

        return {
            users: updatedUsers,
        };
    },
    delete: async (db, { users }) => {
        const userIds = users.map((u) => u.userId);
        const count = await db(lamington.user)
            .whereIn(user.userId, userIds)
            .delete();
        return { count };
    },
    verifyPermissions: async (db, { userId, status }) => {
        const statuses = EnsureArray(status);
        const result = await db(lamington.user)
            .select(user.status)
            .where(user.userId, userId)
            .first();

        return {
            userId,
            hasPermissions: result ? statuses.includes(result.status) : false,
        };
    },
};
