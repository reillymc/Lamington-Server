import {
    DeleteObjectCommand,
    PutObjectCommand,
    type S3Client,
} from "@aws-sdk/client-s3";
import type { FileRepository } from "../fileRepository.ts";

export const createS3FileRepository = (
    s3Client: S3Client,
    bucket: string,
    subPath: string,
): FileRepository => ({
    delete: async (_, { path }) => {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: path,
        });

        const result = await s3Client.send(command);
        if (result.$metadata.httpStatusCode !== 200) {
            return false;
        }

        return true;
    },
    create: async (_, { file, attachmentId, userId }) => {
        const key = `${subPath}/${userId}/${attachmentId}`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file,
        });

        const result = await s3Client.send(command);
        if (result.$metadata.httpStatusCode !== 200) {
            return false;
        }

        return `s3:${key}`;
    },
});
