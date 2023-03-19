import path from "path";
import express from "express";
import { v4 as Uuid } from "uuid";

import config from "../config";
import { AppError, compressImage, storeLocalImage, uploadImageToImgur, uploadImageToS3 } from "../services";
import { uploadImageMiddleware } from "../middleware";
import {
    AttachmentEndpoint,
    PostImageAttachmentRequestBody,
    PostImageAttachmentRequestParams,
    PostImageAttachmentResponse,
} from "./spec";

const router = express.Router();

// upload image
router.post<PostImageAttachmentRequestParams, PostImageAttachmentResponse, PostImageAttachmentRequestBody>(
    AttachmentEndpoint.postImage,
    uploadImageMiddleware,
    async (req, res, next) => {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ error: true, message: "No file was uploaded." });
        }

        switch (config.service.imageStorage) {
            case "local":
                const name = `${Uuid()}.jpeg`;

                try {
                    await storeLocalImage(file.buffer, name);
                    return res.json({ error: false, data: { address: `lamington:${name}` } });
                } catch (e: unknown) {
                    next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
                }
                break;
            case "imgur":
                try {
                    const resizedFile = await compressImage(file.buffer);
                    const uploadResponse = await uploadImageToImgur(resizedFile);

                    return res.json({
                        error: false,
                        data: {
                            address: `imgur:${uploadResponse.id}${path.extname(req?.file?.originalname ?? ".jpeg")}`,
                        },
                    });
                } catch (e: unknown) {
                    next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
                }
                break;
            case "s3":
                try {
                    console.log(req?.file?.originalname);

                    const s3FileName = `${Uuid()}${path.extname(req?.file?.originalname ?? ".jpeg")}`;
                    const resizedFile = await compressImage(file.buffer);
                    const uploadResponse = await uploadImageToS3(resizedFile, s3FileName);

                    return res.json({
                        error: false,
                        data: {
                            address: `s3:${s3FileName}`,
                        },
                    });
                } catch (e: unknown) {
                    next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
                }
        }
    }
);

export default router;
