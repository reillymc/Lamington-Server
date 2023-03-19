import axios from "axios";
import sharp from "sharp";
import FormData from "form-data";
import { FileFilterCallback } from "multer";
import { Request } from "express";
import { v4 as Uuid } from "uuid";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import config from "../config";
import path from "path";

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

export const imageFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype);
    callback(null, validFile);
};

export const compressImage = (file: Buffer) =>
    sharp(file)
        .toFormat("jpeg", { mozjpeg: true, quality: 60 })
        .resize({ width: 2048, height: 2048, fit: "inside" })
        .withMetadata()
        .toBuffer();

export const storeLocalImage = (file: Buffer, name: string) =>
    sharp(file).jpeg({ force: true, mozjpeg: true, quality: 50 }).toFile(`uploads/${name}`);

export const uploadImageToImgur = async (file: Buffer) => {
    const formData = new FormData();
    formData.append("image", file.toString("base64"));

    const headers = {
        Authorization: `Client-ID ${config.service.imgurClientId}`,
        ...formData.getHeaders(),
    };

    const response = await axios({
        method: "post",
        url: "https://api.imgur.com/3/image",
        headers,
        data: formData,
    });

    const { data } = (await response.data) as { data: { id: string } };
    return data;
};

export const uploadImageToS3 = async (file: Buffer, name: string) => {
    if (!config.service.awsBucketName || !config.service.awsAccessKeyId || !config.service.awsSecretAccessKey) {
        throw new Error("AWS Bucket Name is not defined");
    }

    const s3 = new S3Client({
        region: config.service.awsRegion,
        credentials: {
            accessKeyId: config.service.awsAccessKeyId,
            secretAccessKey: config.service.awsSecretAccessKey,
        },
    });

    const command = new PutObjectCommand({
        Bucket: config.service.awsBucketName,
        Key: name,
        Body: file,
    });

    return s3.send(command);
};
