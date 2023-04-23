import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import config from "../../config";
import { imagePath, unsavedImagePath } from "./helper";

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
    });
};

const uploadObject = async (file: Buffer, name: string) => {
    const s3 = createS3Client();

    const command = new PutObjectCommand({
        Bucket: config.attachments.awsBucketName,
        Key: name,
        Body: file,
    });

    return s3.send(command);
};

const deleteObject = (url: string) => {
    const s3 = createS3Client();

    const command = new DeleteObjectCommand({
        Bucket: config.attachments.awsBucketName,
        Key: url,
    });

    s3.send(command);
};

const moveObject = (userId: string, entity: string, entityId: string, version: number) => {
    const s3 = createS3Client();

    const sourcePath = unsavedImagePath(userId, entity);
    const destinationPath = imagePath(userId, entity, entityId, version);

    const command = new CopyObjectCommand({
        Bucket: config.attachments.awsBucketName,
        CopySource: `${config.attachments.awsBucketName}/${sourcePath}`,
        Key: destinationPath,
    });

    s3.send(command).then(({ CopyObjectResult }) => {
        if (CopyObjectResult) {
            deleteObject(imagePath(userId, entity, entityId, version - 1));
            deleteObject(sourcePath);
        }
    });

    return destinationPath;
};

export const S3Attachment = {
    delete: deleteObject,
    move: moveObject,
    upload: uploadObject,
};
