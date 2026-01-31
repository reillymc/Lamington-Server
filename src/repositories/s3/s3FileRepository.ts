import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

import config from "../../config.ts";
import type { FileRepository } from "../fileRepository.ts";

const createS3Client = () => {
    if (
        !config.attachments.awsBucketName ||
        !config.attachments.awsAccessKeyId ||
        !config.attachments.awsSecretAccessKey
    ) {
        throw new Error("AWS bucket details not defined");
    }

    return new S3Client({
        region: config.attachments.awsRegion,
        credentials: {
            accessKeyId: config.attachments.awsAccessKeyId,
            secretAccessKey: config.attachments.awsSecretAccessKey,
        },
        useDualstackEndpoint: true,
    });
};

export const S3FileRepository: FileRepository = {
    delete: async (_, { path }) => {
        const s3 = createS3Client();

        const command = new DeleteObjectCommand({
            Bucket: config.attachments.awsBucketName,
            Key: path,
        });

        const result = await s3.send(command);
        if (result.$metadata.httpStatusCode !== 200) {
            return false;
        }

        return true;
    },
    create: async (_, { path, file }) => {
        const s3 = createS3Client();

        const command = new PutObjectCommand({
            Bucket: config.attachments.awsBucketName,
            Key: path,
            Body: file,
        });

        const result = await s3.send(command);
        if (result.$metadata.httpStatusCode !== 200) {
            return false;
        }

        return true;
    },
};
