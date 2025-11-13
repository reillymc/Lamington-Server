import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import config from "../../config.ts";

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

const uploadObject = async (file: Buffer, name: string) => {
    const s3 = createS3Client();

    const command = new PutObjectCommand({
        Bucket: config.attachments.awsBucketName,
        Key: name,
        Body: file,
    });

    const result = await s3.send(command);
    if (result.$metadata.httpStatusCode !== 200) {
        throw new Error("Failed to upload object to S3");
    }

    return true;
};

const deleteObject = (url: string) => {
    const s3 = createS3Client();

    const command = new DeleteObjectCommand({
        Bucket: config.attachments.awsBucketName,
        Key: url,
    });

    s3.send(command);
};

export const S3Attachment = {
    delete: deleteObject,
    upload: uploadObject,
};
