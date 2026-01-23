import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import type { AttachmentActions } from "../../src/controllers/attachment.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import type { PostImageAttachmentResponse } from "../../src/routes/spec/index.ts";
import type { AttachmentService } from "../../src/services/attachment/attachmentService.ts";
import { readAllAttachments } from "../helpers/attachment.ts";
import {
    AttachmentEndpoint,
    PrepareAuthenticatedUser,
} from "../helpers/index.ts";

const MockSuccessfulAttachmentService: AttachmentService = {
    put: async () => true,
    delete: async () => true,
};

const MockFailingAttachmentService: AttachmentService = {
    put: async () => false,
    delete: async () => false,
};

const MockFailingAttachmentActions: AttachmentActions = {
    read: async () => {
        throw "Mock Error";
    },
    save: async () => {
        throw "Mock Error";
    },
};

after(async () => {
    await db.destroy();
});

describe("post", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({
            database,
            attachmentService: MockSuccessfulAttachmentService,
        });
    });

    afterEach(async () => {
        await database.rollback();
        mock.reset();
    });

    it("should require authentication", async () => {
        const res = await request(app)
            .get(AttachmentEndpoint.postImage)
            .attach("file", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(401);
    });

    it("should fail when no file is provided", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token);

        expect(res.statusCode).toEqual(400);
    });

    it("should upload valid image", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostImageAttachmentResponse;

        expect(data!.attachmentId).toBeTruthy();
        expect(data!.uri).toBeTruthy();

        const attachmentReadResponse = await readAllAttachments(database);
        expect(attachmentReadResponse).toHaveLength(1);
        expect(data!.attachmentId).toEqual(
            attachmentReadResponse[0]!.attachmentId,
        );
    });

    it("should not save to db when upload fails", async () => {
        app = setupApp({
            database,
            attachmentService: MockFailingAttachmentService,
        });
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        const attachmentReadResponse = await readAllAttachments(database);

        expect(attachmentReadResponse).toHaveLength(0);
    });

    it("should not upload when save to db fails", async () => {
        const mockPut = mock.fn(async () => true);
        app = setupApp({
            database,
            attachmentActions: MockFailingAttachmentActions,
            attachmentService: {
                ...MockSuccessfulAttachmentService,
                put: mockPut,
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        expect(mockPut.mock.callCount()).toEqual(0);
    });
});
