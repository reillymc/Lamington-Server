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

        try {
            switch (config.attachments.storageService) {
                case "local":
                    const name = `${Uuid()}.jpeg`;
                    await storeLocalImage(await compressImage(file.buffer), name);
                    return res.json({ error: false, data: { address: `lamington:${name}` } });
                case "imgur":
                    const uploadResponse = await uploadImageToImgur(await compressImage(file.buffer));
                    return res.json({
                        error: false,
                        data: {
                            address: `imgur:${uploadResponse.id}${path.extname(req?.file?.originalname ?? ".jpeg")}`,
                        },
                    });
                case "s3":
                    const s3FileName = `${Uuid()}${path.extname(req?.file?.originalname ?? ".jpeg")}`;
                    await uploadImageToS3(await compressImage(file.buffer), s3FileName);
                    return res.json({
                        error: false,
                        data: {
                            address: `s3:${s3FileName}`,
                        },
                    });
            }
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
        }
    }
);

export default router;
