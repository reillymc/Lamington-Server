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

const mockReadFile = mock.fn<FileRepository["read"]>(
    async (_, { attachmentId }) => ({
        attachmentId,
        type: "redirect" as const,
        url: `https://cdn.example.com/${attachmentId}`,
    }),
);

const MockSuccessfulFileRepository: FileRepository = {
    create: mockCreateFile,
    read: mockReadFile,
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
    read: mockReadFile,
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
        mockReadFile.mock.resetCalls();
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
    });

    it("should return 413 for uploads exceeding the size limit", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", Buffer.alloc(6 * 1024 * 1024), "large.jpg");

        expect(res.statusCode).toEqual(413);
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
    afterEach(() => {
        mockReadFile.mock.resetCalls();
    });

    const withReadResult = (read: FileRepository["read"]) =>
        createTestApp({
            database,
            repositories: {
                fileRepository: { ...MockSuccessfulFileRepository, read },
            },
        });

    it("should redirect to the stored image location", async () => {
        const localApp = withReadResult(async (_, { attachmentId }) => ({
            attachmentId,
            type: "redirect" as const,
            url: `https://cdn.example.com/${attachmentId}`,
        }));

        const [token] = await PrepareAuthenticatedUser(database);
        const attachmentId = uuid();

        const res = await request(localApp)
            .get(`/v1/attachments/image/${attachmentId}`)
            .set(token)
            .redirects(0);

        expect(res.statusCode).toEqual(301);
        expect(res.headers.location).toEqual(
            `https://cdn.example.com/${attachmentId}`,
        );
    });

    it("should stream a local file as jpeg", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "attachments-"));
        try {
            const attachmentId = uuid();
            const filePath = path.join(root, attachmentId);
            const contents = Buffer.from("jpeg-bytes");
            await writeFile(filePath, contents);

            const localApp = withReadResult(async (_, request) => ({
                attachmentId: request.attachmentId,
                type: "file" as const,
                path: filePath,
            }));

            const [token] = await PrepareAuthenticatedUser(database);

            const res = await request(localApp)
                .get(`/v1/attachments/image/${attachmentId}`)
                .set(token);

            expect(res.statusCode).toEqual(200);
            expect(res.headers["content-type"]).toContain("image/jpeg");
            expect(Buffer.from(res.body)).toEqual(contents);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it("should return 404 when the local file is missing", async () => {
        const localApp = withReadResult(async (_, { attachmentId }) => ({
            attachmentId,
            type: "file" as const,
            path: path.join(tmpdir(), `missing-${attachmentId}`),
        }));

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(localApp)
            .get(`/v1/attachments/image/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });
});
