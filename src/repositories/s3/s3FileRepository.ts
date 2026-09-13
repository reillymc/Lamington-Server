import {
    DeleteObjectsCommand,
    PutObjectCommand,
    type S3Client,
} from "@aws-sdk/client-s3";
import { EnsureArray } from "@reillymc/es-utils";
import { mapInBatches } from "../common/mapInBatches.ts";
import type {
    CreateRequest,
    CreateResponse,
    DeleteRequest,
    DeleteResponse,
    FileRepository,
} from "../fileRepository.ts";

const isSuccessStatus = (statusCode?: number) =>
    statusCode !== undefined && statusCode >= 200 && statusCode < 300;

const S3_DELETE_BATCH_SIZE = 1000;

export const createS3FileRepository = (
    s3Client: S3Client,
    bucket: string,
): FileRepository => {
    const createFile = async ({
        file,
        attachmentId,
    }: CreateRequest): Promise<CreateResponse> => {
        try {
            const result = await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: attachmentId,
                    Body: file,
                    ContentType: "image/jpeg",
                }),
            );

            if (!isSuccessStatus(result.$metadata.httpStatusCode)) {
                return { attachmentId, succeeded: false };
            }

            return { attachmentId, succeeded: true };
        } catch {
            return { attachmentId, succeeded: false };
        }
    };

    const deleteBatch = async (
        batch: ReadonlyArray<DeleteRequest>,
    ): Promise<ReadonlyArray<DeleteResponse>> => {
        try {
            const result = await s3Client.send(
                new DeleteObjectsCommand({
                    Bucket: bucket,
                    Delete: {
                        Objects: batch.map(({ attachmentId }) => ({
                            Key: attachmentId,
                        })),
                        Quiet: true,
                    },
                }),
            );

            if (!isSuccessStatus(result.$metadata.httpStatusCode)) {
                return batch.map(({ attachmentId }) => ({
                    attachmentId,
                    succeeded: false,
                }));
            }

            const failedKeys = new Set(
                (result.Errors ?? []).map(({ Key }) => Key),
            );

            return batch.map(({ attachmentId }) => ({
                attachmentId,
                succeeded: !failedKeys.has(attachmentId),
            }));
        } catch {
            return batch.map(({ attachmentId }) => ({
                attachmentId,
                succeeded: false,
            }));
        }
    };

    const deleteFiles = async (
        files: ReadonlyArray<DeleteRequest>,
    ): Promise<ReadonlyArray<DeleteResponse>> => {
        const results: Array<DeleteResponse> = [];

        for (
            let index = 0;
            index < files.length;
            index += S3_DELETE_BATCH_SIZE
        ) {
            results.push(
                ...(await deleteBatch(
                    files.slice(index, index + S3_DELETE_BATCH_SIZE),
                )),
            );
        }

        return results;
    };

    return {
        create: (_, request) => mapInBatches(createFile, EnsureArray(request)),
        delete: (_, request) => deleteFiles(EnsureArray(request)),
    };
};
