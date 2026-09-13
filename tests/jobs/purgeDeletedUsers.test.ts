import { after, afterEach, beforeEach, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { createPurgeDeletedUsersJob } from "../../src/jobs/purgeDeletedUsers.ts";
import type { FileRepository } from "../../src/repositories/fileRepository.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import type { UserRepository } from "../../src/repositories/userRepository.ts";
import { SYSTEM_USER_ID } from "../../src/utils/systemUser.ts";
import { createSpyingFileRepository } from "../helpers/fileRepository.ts";
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
    deletedAt: Date | null,
) => {
    const userId = uuid();
    await database("user").insert({
        userId,
        email: `${userId}@test.com`,
        firstName: "Test",
        lastName: "User",
        password: "password",
        status,
        deletedAt,
    });
    return userId;
};

const createJob = (
    database: KnexDatabase,
    fileRepository: FileRepository = createSpyingFileRepository()
        .fileRepository,
) =>
    createPurgeDeletedUsersJob({
        database,
        repositories: {
            userRepository: KnexUserRepository,
            attachmentRepository: KnexAttachmentRepository,
            fileRepository,
        },
        logger: silentLogger,
    });

const readIds = async (table: string, idColumn: string) =>
    (await database(table).select(idColumn)).map((row) => row[idColumn]);

it("deletes a deleted user past the retention window, cascading rows and queuing their files", async () => {
    const userId = await createUser(database, "D", staleDate());

    const contentId = uuid();
    await database("content").insert({ contentId, createdBy: userId });
    await database("ingredient").insert({
        ingredientId: contentId,
        name: "Stale",
    });

    const attachmentId = uuid();
    await database("attachment").insert({ attachmentId, createdBy: userId });

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);

    expect(await readIds("user", "userId")).not.toContain(userId);
    expect(await readIds("content", "contentId")).not.toContain(contentId);
    expect(await readIds("ingredient", "ingredientId")).not.toContain(
        contentId,
    );
    expect(await readIds("attachment", "attachmentId")).not.toContain(
        attachmentId,
    );

    expect(
        deleteFile.mock.calls.map(
            ({ arguments: [, { attachmentId }] }) => attachmentId,
        ),
    ).toEqual([attachmentId]);
});

it("keeps recently deleted users and active users past the retention window", async () => {
    const recentDeletedId = await createUser(database, "D", new Date());
    const staleActiveId = await createUser(database, "M", null);

    const result = await createJob(database).run();

    expect(result).toBe(true);

    const userIds = await readIds("user", "userId");
    expect(userIds).toContain(recentDeletedId);
    expect(userIds).toContain(staleActiveId);
});

it("clears deletedAt when a deleted user is restored", async () => {
    const userId = await createUser(database, "D", staleDate());

    await KnexUserRepository.updateStatus(database, {
        users: [{ userId, status: "M" }],
    });

    const row = await database("user")
        .select("status", "deletedAt")
        .where({ userId })
        .first();
    expect(row!.status).toEqual("M");
    expect(row!.deletedAt).toEqual(null);

    const result = await createJob(database).run();
    expect(result).toBe(true);
    expect(await readIds("user", "userId")).toContain(userId);
});

it("skips the system user even when marked deleted and stale", async () => {
    await database("user")
        .where({ userId: SYSTEM_USER_ID })
        .update({ status: "D", deletedAt: staleDate() });

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
        repositories: {
            userRepository,
            attachmentRepository: KnexAttachmentRepository,
            fileRepository: createSpyingFileRepository().fileRepository,
        },
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

it("hard-deletes a purgeable user even when their files cannot be deleted", async () => {
    const userId = await createUser(database, "D", staleDate());
    await database("attachment").insert({
        createdBy: userId,
    });

    const { fileRepository, deleteFile } = createSpyingFileRepository(false);

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(false);
    expect(await readIds("user", "userId")).not.toContain(userId);
    expect(deleteFile.mock.calls).toHaveLength(1);
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
        repositories: {
            userRepository,
            attachmentRepository: KnexAttachmentRepository,
            fileRepository: createSpyingFileRepository().fileRepository,
        },
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
