import { expect } from "expect";
import type { Express } from "express";
import { afterEach, beforeEach, describe, it, mock, skip } from "node:test";
import request from "supertest";
import { rm } from "node:fs/promises";
import type { Knex } from "knex";

import { setupApp } from "../../src/app.ts";
import { type PostImageAttachmentResponse } from "../../src/routes/spec/index.ts";
import { AttachmentEndpoint, PrepareAuthenticatedUser } from "../helpers/index.ts";
import db from "../../src/database/index.ts";
import type { AttachmentService } from "../../src/services/attachment/attachmentService.ts";
import { AttachmentActions } from "../../src/controllers/attachment.ts";
import { readAllAttachments } from "../helpers/attachment.ts";

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

describe("post", () => {
    let conn: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        conn = await db.transaction();
        app = setupApp({ conn, attachmentService: MockSuccessfulAttachmentService });
    });

    afterEach(async () => {
        conn.rollback();
        mock.reset();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(AttachmentEndpoint.postImage).attach("file", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(401);
    });

    it("should fail when no file is provided", async () => {
        const [token] = await PrepareAuthenticatedUser(conn);

        const res = await request(app).post(AttachmentEndpoint.postImage).set(token);

        expect(res.statusCode).toEqual(400);
    });

    it("should upload valid image", async () => {
        const [token] = await PrepareAuthenticatedUser(conn);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostImageAttachmentResponse;

        expect(data!.attachmentId).toBeTruthy();
        expect(data!.uri).toBeTruthy();

        const attachmentReadResponse = await readAllAttachments(conn);
        expect(attachmentReadResponse).toHaveLength(1);
        expect(data!.attachmentId).toEqual(attachmentReadResponse[0]!.attachmentId);
    });

    it("should not save to db when upload fails", async () => {
        app = setupApp({ conn, attachmentService: MockFailingAttachmentService });
        const [token] = await PrepareAuthenticatedUser(conn);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        const attachmentReadResponse = await readAllAttachments(conn);

        expect(attachmentReadResponse).toHaveLength(0);
    });

    it("should not upload when save to db fails", async () => {
        const mockPut = mock.fn(async () => true);
        app = setupApp({
            conn,
            attachmentActions: MockFailingAttachmentActions,
            attachmentService: { ...MockSuccessfulAttachmentService, put: mockPut },
        });

        const [token] = await PrepareAuthenticatedUser(conn);

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(500);

        expect(mockPut.mock.callCount()).toEqual(0);
    });
});
