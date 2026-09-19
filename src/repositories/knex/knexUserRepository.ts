import { EnsureArray, Undefined } from "@reillymc/es-utils";
import { SYSTEM_USER_ID } from "../../utils/systemUser.ts";
import { UniqueViolationError } from "../common/errors.ts";
import type { UserRepository } from "../userRepository.ts";
import { isUniqueViolation } from "./common/postgresErrors.ts";
import type { KnexDatabase } from "./knex.ts";
import { lamington, UserTable } from "./spec/index.ts";

export const KnexUserRepository: UserRepository<KnexDatabase> = {
    read: async (db, { users }) => {
        const userIds = users.map((u) => u.userId);
        const result = await db(lamington.user)
            .select(
                UserTable.userId,
                UserTable.email,
                UserTable.firstName,
                UserTable.lastName,
                UserTable.status,
            )
            .whereIn(UserTable.userId, userIds);

        return {
            users: result.map((u) => ({
                userId: u.userId,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                status: u.status,
            })),
        };
    },
    readAll: async (db, { filter }) => {
        const query = db(lamington.user)
            .select(
                UserTable.userId,
                UserTable.firstName,
                UserTable.lastName,
                UserTable.email,
                UserTable.status,
            )
            .whereNot(UserTable.userId, SYSTEM_USER_ID);

        if (filter?.status) {
            query.whereIn(UserTable.status, EnsureArray(filter.status));
        } else {
            query.whereNotIn(UserTable.status, ["P", "B", "D"]);
        }

        const result = await query;

        return {
            users: result.map((u) => ({
                userId: u.userId,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                status: u.status,
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
                UserTable.userId,
                UserTable.firstName,
                UserTable.lastName,
                UserTable.email,
                UserTable.status,
                UserTable.createdAt,
                UserTable.password,
            )
            .where((builder) => {
                if (emails.length > 0)
                    builder.orWhereIn(UserTable.email, emails);
                if (userIds.length > 0)
                    builder.orWhereIn(UserTable.userId, userIds);
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
    readPurgeableUsers: async (db, { deletedBefore, limit }) => {
        const result = await db(lamington.user)
            .select(UserTable.userId)
            .whereNotNull(UserTable.deletedAt)
            .where(UserTable.deletedAt, "<", deletedBefore)
            .whereNot(UserTable.userId, SYSTEM_USER_ID)
            .orderBy(UserTable.deletedAt)
            .forUpdate()
            .skipLocked()
            .limit(limit);

        return { users: result };
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

            return { users: createdUsers };
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new UniqueViolationError(error);
            }
            throw error;
        }
    },
    updateStatus: async (db, { users }) => {
        if (!users.length) return { users: [] };

        for (const { userId, status } of users) {
            await db(lamington.user)
                .where(UserTable.userId, userId)
                .update({ status, deletedAt: null });
        }

        const updatedUsers = await db(lamington.user)
            .select(UserTable.userId, UserTable.status)
            .whereIn(
                UserTable.userId,
                users.map(({ userId }) => userId),
            );

        return {
            users: updatedUsers,
        };
    },
    softDelete: async (db, { users }) => {
        const userIds = users.map(({ userId }) => userId);

        if (!userIds.length) return { count: 0 };

        const count = await db(lamington.user)
            .whereIn(UserTable.userId, userIds)
            .whereNot(UserTable.userId, SYSTEM_USER_ID)
            .update({
                status: "D",
                deletedAt: db.raw('COALESCE("deletedAt", now())'),
            });

        return { count };
    },
    delete: async (db, { users }) => {
        const userIds = users.map((u) => u.userId);

        if (!userIds.length) return { count: 0 };

        const count = await db(lamington.user)
            .whereIn(UserTable.userId, userIds)
            .whereNot(UserTable.userId, SYSTEM_USER_ID)
            .delete();
        return { count };
    },
    verifyPermissions: async (db, { userId, status }) => {
        const statuses = EnsureArray(status);
        const result = await db(lamington.user)
            .select(UserTable.status)
            .where(UserTable.userId, userId)
            .first();

        return {
            userId,
            hasPermissions: result ? statuses.includes(result.status) : false,
        };
    },
};
