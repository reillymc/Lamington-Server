import { expect } from "expect";
import type { Express } from "express";
import { afterEach, beforeEach, describe, it, skip } from "node:test";
import request from "supertest";
import { rm } from "node:fs/promises";

import { setupApp } from "../../src/app.ts";
import { type PostImageAttachmentResponse } from "../../src/routes/spec/index.ts";
import { AttachmentEndpoint, PrepareAuthenticatedUser } from "../helpers/index.ts";

describe("post", () => {
    // let trx: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        // trx = await db.transaction();
        app = setupApp();
    });

    afterEach(async () => {
        // trx.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(AttachmentEndpoint.postImage).attach("file", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(401);
    });

    it("should fail when no file is provided", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).post(AttachmentEndpoint.postImage).set(token);

        expect(res.statusCode).toEqual(400);
    });

    it("should upload valid image", async () => {
        const [token, { userId }] = await PrepareAuthenticatedUser();

        const res = await request(app)
            .post(AttachmentEndpoint.postImage)
            .set(token)
            .attach("photo", "tests/testAttachment.jpg");

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostImageAttachmentResponse;

        // TODO: DI mock upload service
        await rm(`uploads/dev/${userId}/${data!.attachmentId}.jpg`);
        await rm(`uploads/dev`, { recursive: true });

        expect(data!.attachmentId).toBeTruthy();
        expect(data!.uri).toBeTruthy();
    });

    // TODO: revisit with proper DI services
    skip("should not save to db when upload fails", async => {});

    skip("should not upload when save to db fails", async => {});
});
