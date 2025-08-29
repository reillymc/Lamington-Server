import express from "express";

import { uploadImageMiddleware } from "../middleware/index.ts";
import { AppError, AttachmentService } from "../services/index.ts";
import {
    AttachmentEndpoint,
    type PostImageAttachmentRequestBody,
    type PostImageAttachmentRequestParams,
    type PostImageAttachmentResponse,
} from "./spec/index.ts";

const router = express.Router();

// upload image
router.post<PostImageAttachmentRequestParams, PostImageAttachmentResponse, PostImageAttachmentRequestBody>(
    AttachmentEndpoint.postImage,
    uploadImageMiddleware,
    async ({ file, body, session }, res, next) => {
        const { entity } = body;
        const { userId } = session;

        if (!file || !userId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "No file was uploaded.",
                })
            );
        }

        if (!entity) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "No entity was provided.",
                })
            );
        }

        if (!["recipe", "ingredient"].includes(entity)) {
            return next(
                new AppError({
                    status: 400,
                    code: "INVALID_DATA",
                    message: "Invalid entity provided.",
                })
            );
        }

        try {
            const address = await AttachmentService.uploadImage(file.buffer, userId, entity, file?.originalname);
            return res.json({
                error: false,
                data: { address },
            });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
        }
    }
);

export default router;
