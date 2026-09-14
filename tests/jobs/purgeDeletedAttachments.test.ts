import { after, afterEach, beforeEach, it } from "node:test";
import { expect } from "expect";
import { createPurgeDeletedAttachmentsJob } from "../../src/jobs/purgeDeletedAttachments.ts";
import type { FileRepository } from "../../src/repositories/fileRepository.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { createSpyingFileRepository } from "../helpers/fileRepository.ts";
import { CreateUsers } from "../helpers/index.ts";
import { db, silentLogger } from "../helpers/setup.ts";

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

const createJob = (database: KnexDatabase, fileRepository: FileRepository) =>
    createPurgeDeletedAttachmentsJob({
        database,
        repositories: {
            attachmentRepository: KnexAttachmentRepository,
            fileRepository,
        },
        logger: silentLogger,
    });

const createDeletedAttachment = async (userId: string) => {
    const [row] = await database("attachment")
        .insert({ createdBy: userId, deletedAt: new Date() })
        .returning("attachmentId");
    return row!;
};

const readAttachmentIds = async () =>
    (await database("attachment").select("attachmentId")).map(
        ({ attachmentId }) => attachmentId,
    );

it("deletes the files and rows of attachments marked for deletion", async () => {
    const [user] = await CreateUsers(database);
    const attachment = await createDeletedAttachment(user!.userId);

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);
    expect(
        deleteFile.mock.calls.map(
            ({ arguments: [, { attachmentId }] }) => attachmentId,
        ),
    ).toEqual([attachment.attachmentId]);
    expect(await readAttachmentIds()).not.toContain(attachment.attachmentId);
});

it("leaves attachments that are not marked for deletion", async () => {
    const [user] = await CreateUsers(database);

    await database("attachment").insert({
        createdBy: user!.userId,
    });

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);
    expect(deleteFile.mock.calls).toHaveLength(0);
    expect(await readAttachmentIds()).toHaveLength(1);
});

it("keeps marked attachments when the file deletion fails", async () => {
    const [user] = await CreateUsers(database);
    const attachment = await createDeletedAttachment(user!.userId);

    const { fileRepository, deleteFile } = createSpyingFileRepository(false);

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(false);
    expect(deleteFile.mock.calls).toHaveLength(1);

    const rows = await database("attachment")
        .select("attachmentId", "deletedAt")
        .where("attachmentId", attachment.attachmentId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.deletedAt).not.toEqual(null);
});

it("does not purge marked attachments that still have references", async () => {
    const [user] = await CreateUsers(database);

    const [content] = await database("content")
        .insert({ createdBy: user!.userId })
        .returning("contentId");

    const attachment = await createDeletedAttachment(user!.userId);

    await database("content_attachment").insert({
        contentId: content!.contentId,
        attachmentId: attachment.attachmentId,
        displayType: "hero",
    });

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);
    expect(deleteFile.mock.calls).toHaveLength(0);
    expect(await readAttachmentIds()).toContain(attachment.attachmentId);
});

it("returns false when the attachment lookup fails", async () => {
    const failingDatabase = (() => {
        throw new Error("Connection refused");
    }) as unknown as KnexDatabase;

    const { fileRepository } = createSpyingFileRepository();

    const result = await createJob(failingDatabase, fileRepository).run();

    expect(result).toBe(false);
});

it("purges never-linked attachments older than 24h but keeps fresh uploads", async () => {
    const [user] = await CreateUsers(database);

    await database("attachment").insert({
        createdBy: user!.userId,
    });
    const [fresh] = await database("attachment")
        .select("attachmentId")
        .orderBy("createdAt", "desc")
        .limit(1);

    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const [old] = await database("attachment")
        .insert({
            createdBy: user!.userId,
            createdAt: oldDate,
            updatedAt: oldDate,
        })
        .returning("attachmentId");

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);
    expect(
        deleteFile.mock.calls.map(
            ({ arguments: [, request] }) => request.attachmentId,
        ),
    ).toEqual([old!.attachmentId]);
    expect(await readAttachmentIds()).toContain(fresh!.attachmentId);
    expect(await readAttachmentIds()).not.toContain(old!.attachmentId);
});

it("drains more than one batch in a single run", async () => {
    const [user] = await CreateUsers(database);

    const rows = Array.from({ length: 150 }, () => ({
        createdBy: user!.userId,
        deletedAt: new Date(),
    }));
    await database("attachment").insert(rows);

    const { fileRepository, deleteFile } = createSpyingFileRepository();

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(true);
    expect(deleteFile.mock.calls).toHaveLength(150);
    expect(await readAttachmentIds()).toHaveLength(0);
});

it("stops after a full batch of failed deletions instead of looping forever", async () => {
    const [user] = await CreateUsers(database);

    const rows = Array.from({ length: 150 }, () => ({
        createdBy: user!.userId,
        deletedAt: new Date(),
    }));
    await database("attachment").insert(rows);

    const { fileRepository, deleteFile } = createSpyingFileRepository(false);

    const result = await createJob(database, fileRepository).run();

    expect(result).toBe(false);
    expect(deleteFile.mock.calls).toHaveLength(100);
    expect(await readAttachmentIds()).toHaveLength(150);
});
