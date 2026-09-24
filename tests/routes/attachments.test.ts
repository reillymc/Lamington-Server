import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { EnsureArray } from "@reillymc/es-utils";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { thumbHashToRGBA } from "thumbhash";
import { v4 as uuid } from "uuid";
import type { AttachmentRepository } from "../../src/repositories/attachmentRepository.ts";
import type { FileRepository } from "../../src/repositories/fileRepository.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { readAllAttachments } from "../helpers/attachment.ts";
import { createImage } from "../helpers/image.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

const mockCreateFile = mock.fn<FileRepository["create"]>(async (_, request) =>
    EnsureArray(request).map(({ attachmentId }) => ({
        attachmentId,
        succeeded: true,
    })),
);

const mockDeleteFile = mock.fn<FileRepository["delete"]>(async (_, request) =>
    EnsureArray(request).map(({ attachmentId }) => ({
        attachmentId,
        succeeded: true,
    })),
);

const MockSuccessfulFileRepository: FileRepository = {
    create: mockCreateFile,
    delete: mockDeleteFile,
};

const mockCreateFailingFile = mock.fn<FileRepository["create"]>(
    async (_, request) =>
        EnsureArray(request).map(({ attachmentId }) => ({
            attachmentId,
            succeeded: false,
        })),
);

const mockDeleteFailingFile = mock.fn<FileRepository["delete"]>(
    async (_, request) =>
        EnsureArray(request).map(({ attachmentId }) => ({
            attachmentId,
            succeeded: false,
        })),
);

const MockFailingFileRepository: FileRepository = {
    create: mockCreateFailingFile,
    delete: mockDeleteFailingFile,
};

const MockFailingAttachmentRepository: AttachmentRepository = {
    create: async () => {
        throw "Mock Error";
    },
    verifyPermissions: async () => {
        throw "Mock Error";
    },
    claimPurgeable: async () => {
        throw "Mock Error";
    },
    deletePurgeable: async () => {
        throw "Mock Error";
    },
    readAllForUsers: async () => {
        throw "Mock Error";
    },
};

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = createTestApp({
        database,
        repositories: { fileRepository: MockSuccessfulFileRepository },
    });
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("Upload an image", () => {
    afterEach(async () => {
        mock.reset();
        mockCreateFile.mock.resetCalls();
        mockDeleteFile.mock.resetCalls();
        mockCreateFailingFile.mock.resetCalls();
        mockDeleteFailingFile.mock.resetCalls();
    });

    it("should respect controlled rate limit", async () => {
        app = createTestApp({
            database,
            repositories: { fileRepository: MockSuccessfulFileRepository },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        // Exceed rate limit
        const responses = await Promise.all(
            Array.from({ length: 20 }).map(() =>
                request(app)
                    .post("/v1/attachments/image")
                    .set(token)
                    .attach("image", Buffer.from("fake"), "test.jpg"),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", Buffer.from("fake"), "test.jpg");

        expect(res.statusCode).toEqual(429);
    });

    it("should fail when no file is provided", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).post("/v1/attachments/image").set(token);

        expect(res.statusCode).toEqual(415);
        expect(res.body).toMatchObject({
            error: true,
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Unsupported media type",
        });
        expect(res.body.fieldErrors).toBeUndefined();
    });

    it("should return 413 for uploads exceeding the size limit", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", Buffer.alloc(6 * 1024 * 1024), "large.jpg");

        expect(res.statusCode).toEqual(413);
        expect(res.body).toMatchObject({
            error: true,
            code: "PAYLOAD_TOO_LARGE",
            message: "File too large",
        });
        expect(res.body.fieldErrors).toBeUndefined();
    });

    it("should upload valid image", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const image = await createImage();

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", image, "test.jpg");

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["ImageAttachment"];

        expect(data.attachmentId).toBeTruthy();
        expect(data.uri).toEqual(`/attachments/image/${data.attachmentId}`);
        expect(data.preview).toBeTruthy();

        const attachmentReadResponse = await readAllAttachments(database);
        expect(attachmentReadResponse).toHaveLength(1);
        expect(data.attachmentId).toEqual(
            attachmentReadResponse[0]!.attachmentId,
        );

        const { w, h, rgba } = thumbHashToRGBA(
            Buffer.from(data.preview!, "base64"),
        );

        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(rgba).toHaveLength(w * h * 4);
    });

    it("should not save to db when upload fails", async () => {
        app = createTestApp({
            database,
            repositories: { fileRepository: MockFailingFileRepository },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", Buffer.from("fake"), "test.jpg");

        expect(res.statusCode).toEqual(500);

        const attachmentReadResponse = await readAllAttachments(database);

        expect(attachmentReadResponse).toHaveLength(0);
    });

    it("should not upload when save to db fails", async () => {
        const mockCreate = mock.fn(async () => []);

        app = createTestApp({
            database,
            repositories: {
                attachmentRepository: MockFailingAttachmentRepository,
                fileRepository: {
                    ...MockSuccessfulFileRepository,
                    create: mockCreate,
                },
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", Buffer.from("fake"), "test.jpg");

        expect(res.statusCode).toEqual(500);

        expect(mockCreate.mock.callCount()).toEqual(0);
    });
});

describe("Get an image", () => {
    const withAttachmentDirectory = (attachmentDirectory?: string) =>
        createTestApp({
            database,
            repositories: { fileRepository: MockSuccessfulFileRepository },
            config: { attachmentDirectory },
        });

    it("should serve a local file as jpeg with immutable caching", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "attachments-"));
        try {
            const attachmentId = uuid();
            const contents = Buffer.from("jpeg-bytes");
            await writeFile(path.join(root, attachmentId), contents);

            const localApp = withAttachmentDirectory(root);

            const [token] = await PrepareAuthenticatedUser(database);

            const res = await request(localApp)
                .get(`/v1/attachments/image/${attachmentId}`)
                .set(token);

            expect(res.statusCode).toEqual(200);
            expect(res.headers["content-type"]).toContain("image/jpeg");
            expect(res.headers["cache-control"]).toContain("immutable");
            expect(Buffer.from(res.body)).toEqual(contents);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it("should return 404 when the local file is missing", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "attachments-"));
        try {
            const localApp = withAttachmentDirectory(root);

            const [token] = await PrepareAuthenticatedUser(database);

            const res = await request(localApp)
                .get(`/v1/attachments/image/${uuid()}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it("should not serve local files when storage is remote", async () => {
        const remoteApp = withAttachmentDirectory(undefined);

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(remoteApp)
            .get(`/v1/attachments/image/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });
});
