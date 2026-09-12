import { after, afterEach, beforeEach, it } from "node:test";
import { expect } from "expect";
import { v4 } from "uuid";
import { createPurgeDeletedUsersJob } from "../../src/jobs/purgeDeletedUsers.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import type { UserRepository } from "../../src/repositories/userRepository.ts";
import { SYSTEM_USER_ID } from "../../src/utils/systemUser.ts";
import { CreateUsers } from "../helpers/index.ts";
import { db, silentLogger } from "../helpers/setup.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

let database: KnexDatabase;

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

const staleDate = () => new Date(Date.now() - 31 * DAY_MS);

const createUser = async (
    database: KnexDatabase,
    status: string,
    updatedAt: Date,
) => {
    const userId = v4();
    await database("user").insert({
        userId,
        email: `${userId}@test.com`,
        firstName: "Test",
        lastName: "User",
        password: "password",
        status,
        updatedAt,
    });
    return userId;
};

const createJob = (database: KnexDatabase) =>
    createPurgeDeletedUsersJob({
        database,
        repositories: { userRepository: KnexUserRepository },
        logger: silentLogger,
    });

const readIds = async (table: string, idColumn: string) =>
    (await database(table).select(idColumn)).map((row) => row[idColumn]);

it("deletes a deleted user past the retention window and cascades their content and attachments", async () => {
    const userId = await createUser(database, "D", staleDate());

    const contentId = v4();
    await database("content").insert({ contentId, createdBy: userId });
    await database("ingredient").insert({
        ingredientId: contentId,
        name: "Stale",
    });

    const attachmentId = v4();
    await database("attachment").insert({
        attachmentId,
        uri: "local:test",
        createdBy: userId,
    });

    const result = await createJob(database).run();

    expect(result).toBe(true);

    expect(await readIds("user", "userId")).not.toContain(userId);
    expect(await readIds("content", "contentId")).not.toContain(contentId);
    expect(await readIds("ingredient", "ingredientId")).not.toContain(
        contentId,
    );
    expect(await readIds("attachment", "attachmentId")).not.toContain(
        attachmentId,
    );
});

it("keeps deleted users within the retention window and non-deleted users past it", async () => {
    const [recentDeleted] = await CreateUsers(database, { status: "D" });
    const staleActiveId = await createUser(database, "M", staleDate());

    const result = await createJob(database).run();

    expect(result).toBe(true);

    const userIds = await readIds("user", "userId");
    expect(userIds).toContain(recentDeleted!.userId);
    expect(userIds).toContain(staleActiveId);
});

it("skips the system user even when marked deleted and stale", async () => {
    await database.raw('ALTER TABLE "user" DISABLE TRIGGER "user_updatedAt";');
    await database("user")
        .where({ userId: SYSTEM_USER_ID })
        .update({ status: "D", updatedAt: staleDate() });
    await database.raw('ALTER TABLE "user" ENABLE TRIGGER "user_updatedAt";');

    const result = await createJob(database).run();

    expect(result).toBe(true);
    expect(await readIds("user", "userId")).toContain(SYSTEM_USER_ID);
});

it("deletes all purgeable users in a single bulk delete", async () => {
    const firstUserId = await createUser(database, "D", staleDate());
    const secondUserId = await createUser(database, "D", staleDate());

    const deleteCalls: Array<ReadonlyArray<{ userId: string }>> = [];
    const userRepository: UserRepository = {
        ...KnexUserRepository,
        delete: async (db, request) => {
            deleteCalls.push(request.users);
            return KnexUserRepository.delete(db as KnexDatabase, request);
        },
    };

    const result = await createPurgeDeletedUsersJob({
        database,
        repositories: { userRepository },
        logger: silentLogger,
    }).run();

    expect(result).toBe(true);
    expect(deleteCalls).toHaveLength(1);

    const requestedUserIds = deleteCalls[0]!.map(({ userId }) => userId);
    expect(requestedUserIds).toHaveLength(2);
    expect(requestedUserIds).toContain(firstUserId);
    expect(requestedUserIds).toContain(secondUserId);

    const userIds = await readIds("user", "userId");
    expect(userIds).not.toContain(firstUserId);
    expect(userIds).not.toContain(secondUserId);
});

it("returns false when the purge delete fails", async () => {
    await createUser(database, "D", staleDate());

    const userRepository: UserRepository = {
        ...KnexUserRepository,
        delete: async () => {
            throw new Error("delete failed");
        },
    };

    const result = await createPurgeDeletedUsersJob({
        database,
        repositories: { userRepository },
        logger: silentLogger,
    }).run();

    expect(result).toBe(false);
});

it("returns false when the user lookup fails", async () => {
    const failingDatabase = (() => {
        throw new Error("Connection refused");
    }) as unknown as KnexDatabase;

    const result = await createJob(failingDatabase).run();

    expect(result).toBe(false);
});
