import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { AttachmentRepository } from "../../src/repositories/attachmentRepository.ts";
import type { FileRepository } from "../../src/repositories/fileRepository.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { readAllAttachments } from "../helpers/attachment.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

const MockSuccessfulFileRepository: FileRepository = {
    create: mock.fn(async () => "uri://"),
    delete: mock.fn(async () => true),
};

const MockFailingFileRepository: FileRepository = {
    create: mock.fn(async () => false),
    delete: mock.fn(async () => false),
};

const MockFailingAttachmentRepository: AttachmentRepository = {
    create: async () => {
        throw "Mock Error";
    },
    update: async () => {
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
    });

    it("should require authentication", async () => {
        const res = await request(app)
            .post("/v1/attachments/image")
            .attach("image", Buffer.from("fake"), "test.jpg");

        expect(res.statusCode).toEqual(401);
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

    it("should upload valid image", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["ImageAttachment"];

        expect(data.attachmentId).toBeTruthy();
        expect(data.uri).toBeTruthy();

        const attachmentReadResponse = await readAllAttachments(database);
        expect(attachmentReadResponse).toHaveLength(1);
        expect(data.attachmentId).toEqual(
            attachmentReadResponse[0]!.attachmentId,
        );
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
        const mockCreate = mock.fn(async () => "uri://");

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
    it("should require authentication", async () => {
        const res = await request(app).get(
            "/v1/attachments/image/test/test/test",
        );
        expect(res.statusCode).toEqual(401);
    });
});
