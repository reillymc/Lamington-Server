import { describe, it } from "node:test";
import {
    DeleteObjectsCommand,
    PutObjectCommand,
    type S3Client,
} from "@aws-sdk/client-s3";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { createS3FileRepository } from "../../src/repositories/s3/s3FileRepository.ts";

type BatchResponse = {
    $metadata: { httpStatusCode: number };
    Errors?: Array<{ Key: string; Code: string; Message: string }>;
};

const createMockClient = (onSend: (command: unknown) => BatchResponse) =>
    ({
        send: async (command: unknown) => onSend(command),
    }) as unknown as S3Client;

describe("s3FileRepository", () => {
    it("should delete using the attachmentId as the key", async () => {
        const sent: Array<{
            Bucket?: unknown;
            Delete?: { Objects?: Array<{ Key?: unknown }> };
        }> = [];
        const client = createMockClient((command) => {
            expect(command).toBeInstanceOf(DeleteObjectsCommand);
            sent.push((command as { input: (typeof sent)[number] }).input);
            return { $metadata: { httpStatusCode: 200 } };
        });
        const repository = createS3FileRepository(client, "bucket");

        const attachmentId = uuid();
        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: true }]);
        expect(sent[0]?.Delete?.Objects?.[0]?.Key).toEqual(attachmentId);
    });

    it("should report failure on non-2xx delete status", async () => {
        const client = createMockClient(() => ({
            $metadata: { httpStatusCode: 500 },
        }));
        const repository = createS3FileRepository(client, "bucket");

        const attachmentId = uuid();
        await expect(
            repository.delete(undefined, { attachmentId }),
        ).resolves.toEqual([{ attachmentId, succeeded: false }]);
    });

    it("should batch delete keys into DeleteObjects requests", async () => {
        const sent: Array<{
            Bucket?: unknown;
            Delete?: { Objects?: Array<{ Key?: unknown }> };
        }> = [];
        const client = createMockClient((command) => {
            expect(command).toBeInstanceOf(DeleteObjectsCommand);
            sent.push((command as { input: (typeof sent)[number] }).input);
            return { $metadata: { httpStatusCode: 200 } };
        });
        const repository = createS3FileRepository(client, "bucket");

        const attachments = [uuid(), uuid()].map((attachmentId) => ({
            attachmentId,
        }));
        const keys = attachments.map(({ attachmentId }) => attachmentId);

        await expect(
            repository.delete(undefined, attachments),
        ).resolves.toEqual(
            attachments.map(({ attachmentId }) => ({
                attachmentId,
                succeeded: true,
            })),
        );

        expect(sent).toHaveLength(1);
        expect(sent[0]?.Bucket).toEqual("bucket");
        expect(sent[0]?.Delete?.Objects?.map(({ Key }) => Key).sort()).toEqual(
            keys.sort(),
        );
    });

    it("should return the failed keys reported by the batch response", async () => {
        const failedAttachmentId = uuid();
        const succeededAttachmentId = uuid();

        const client = createMockClient(() => ({
            $metadata: { httpStatusCode: 200 },
            Errors: [
                {
                    Key: failedAttachmentId,
                    Code: "InternalError",
                    Message: "boom",
                },
            ],
        }));
        const repository = createS3FileRepository(client, "bucket");

        await expect(
            repository.delete(undefined, [
                { attachmentId: failedAttachmentId },
                { attachmentId: succeededAttachmentId },
            ]),
        ).resolves.toEqual([
            { attachmentId: failedAttachmentId, succeeded: false },
            { attachmentId: succeededAttachmentId, succeeded: true },
        ]);
    });

    it("should report every file as failed when a batch request throws", async () => {
        const client = createMockClient(() => {
            throw new Error("network unavailable");
        });
        const repository = createS3FileRepository(client, "bucket");

        const attachments = [
            { attachmentId: uuid() },
            { attachmentId: uuid() },
        ];

        await expect(
            repository.delete(undefined, attachments),
        ).resolves.toEqual(
            attachments.map(({ attachmentId }) => ({
                attachmentId,
                succeeded: false,
            })),
        );
    });

    it("should upload each file keyed by attachmentId", async () => {
        const sent: Array<{
            Bucket?: unknown;
            Key?: unknown;
            Body?: unknown;
            ContentType?: unknown;
        }> = [];
        const client = createMockClient((command) => {
            expect(command).toBeInstanceOf(PutObjectCommand);
            sent.push((command as { input: (typeof sent)[number] }).input);
            return { $metadata: { httpStatusCode: 200 } };
        });
        const repository = createS3FileRepository(client, "bucket");

        const attachmentIds = [uuid(), uuid()];
        const file = Buffer.from("image");

        await expect(
            repository.create(
                undefined,
                attachmentIds.map((attachmentId) => ({
                    file,
                    attachmentId,
                })),
            ),
        ).resolves.toEqual(
            attachmentIds.map((attachmentId) => ({
                attachmentId,
                succeeded: true,
            })),
        );

        expect(sent[0]?.Bucket).toEqual("bucket");
        expect(sent[0]?.Key).toEqual(attachmentIds[0]);
        expect(sent[0]?.Body).toEqual(file);
        expect(sent[0]?.ContentType).toEqual("image/jpeg");
    });

    it("should report failure when the upload returns a non-2xx status", async () => {
        const client = createMockClient(() => ({
            $metadata: { httpStatusCode: 500 },
        }));
        const repository = createS3FileRepository(client, "bucket");

        const attachmentId = uuid();

        await expect(
            repository.create(undefined, {
                file: Buffer.from("image"),
                attachmentId,
            }),
        ).resolves.toEqual([
            {
                attachmentId,
                succeeded: false,
            },
        ]);
    });

    it("should report failure when the upload throws", async () => {
        const client = createMockClient(() => {
            throw new Error("network unavailable");
        });
        const repository = createS3FileRepository(client, "bucket");

        const attachmentId = uuid();

        await expect(
            repository.create(undefined, {
                file: Buffer.from("image"),
                attachmentId,
            }),
        ).resolves.toEqual([
            {
                attachmentId,
                succeeded: false,
            },
        ]);
    });
});
