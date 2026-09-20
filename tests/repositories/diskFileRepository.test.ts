import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { createDiskFileRepository } from "../../src/repositories/disk/diskFileRepository.ts";
import { createImage } from "../helpers/image.ts";

const createRoot = async (t: { after: (fn: () => Promise<void>) => void }) => {
    const root = await mkdtemp(path.join(tmpdir(), "disk-repo-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
};

describe("diskFileRepository", () => {
    it("should delete the file at the attachmentId key", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentId = uuid();
        const absolutePath = path.join(root, attachmentId);
        await writeFile(absolutePath, "jpeg");

        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);
        expect(existsSync(absolutePath)).toEqual(false);
    });

    it("should return true when the file does not exist", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentId = uuid();
        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);
    });

    it("should report files that could not be deleted", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentId = uuid();
        await mkdir(path.join(root, attachmentId), { recursive: true });

        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: false }]);
    });

    it("should delete every file passed to delete", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachments = [uuid(), uuid()].map((attachmentId) => ({
            attachmentId,
            absolutePath: path.join(root, attachmentId),
        }));
        for (const { absolutePath } of attachments) {
            await mkdir(path.dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, "jpeg");
        }

        const requests = attachments.map(({ attachmentId }) => ({
            attachmentId,
        }));

        await expect(repository.delete(undefined, requests)).resolves.toEqual(
            requests.map(({ attachmentId }) => ({
                attachmentId,
                succeeded: true,
            })),
        );

        for (const { absolutePath } of attachments) {
            expect(existsSync(absolutePath)).toEqual(false);
        }
    });

    it("should swallow missing files passed to delete", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentId = uuid();

        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);
    });

    it("should create every file passed to create", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentIds = [uuid(), uuid()];
        const file = await createImage();

        const result = await repository.create(
            undefined,
            attachmentIds.map((attachmentId) => ({
                file,
                attachmentId,
            })),
        );

        expect(result).toEqual(
            attachmentIds.map((attachmentId) => ({
                attachmentId,
                succeeded: true,
            })),
        );

        for (const attachmentId of attachmentIds) {
            expect(existsSync(path.join(root, attachmentId))).toEqual(true);
        }
    });

    it("should report files that failed to be created", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root);

        const attachmentId = uuid();

        await expect(
            repository.create(undefined, {
                file: Buffer.from("not an image"),
                attachmentId,
            }),
        ).resolves.toEqual([
            {
                attachmentId,
                succeeded: false,
            },
        ]);

        expect(existsSync(path.join(root, attachmentId))).toEqual(false);
    });

    it("should store and delete files under the key prefix", async (t) => {
        const root = await createRoot(t);

        const repository = createDiskFileRepository(root, "dev/attachments");

        const attachmentId = uuid();
        const file = await createImage();

        await expect(
            repository.create(undefined, { file, attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);

        const prefixedPath = path.join(
            root,
            "dev",
            "attachments",
            attachmentId,
        );
        expect(existsSync(prefixedPath)).toEqual(true);

        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);
        expect(existsSync(prefixedPath)).toEqual(false);
    });
});
