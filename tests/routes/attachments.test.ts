import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import type { AttachmentRepository } from "../../src/repositories/attachmentRepository.ts";
import type { FileRepository } from "../../src/repositories/fileRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { readAllAttachments } from "../helpers/attachment.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";

const MockSuccessfulFileRepository: FileRepository = {
    create: mock.fn(async () => true),
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

after(async () => {
    await db.destroy();
});

describe("Upload an image", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({
            database,
            repositories: { fileRepository: MockSuccessfulFileRepository },
        });
    });

    afterEach(async () => {
        await database.rollback();
        mock.reset();
    });

    it("should require authentication", async () => {
        const res = await request(app)
            .post("/v1/attachments/image")
            .attach("image", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(401);
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
        app = setupApp({
            database,
            repositories: { fileRepository: MockFailingFileRepository },
        });
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/attachments/image")
            .set(token)
            .attach("image", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        const attachmentReadResponse = await readAllAttachments(database);

        expect(attachmentReadResponse).toHaveLength(0);
    });

    it("should not upload when save to db fails", async () => {
        const mockCreate = mock.fn(async () => true);
        app = setupApp({
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
            .attach("image", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        expect(mockCreate.mock.callCount()).toEqual(0);
    });
});
