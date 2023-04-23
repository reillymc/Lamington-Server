import express from "express";

import { AppError, AttachmentService } from "../services";
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
        const {
            file,
            body: { entity },
            secret,
        } = req;

        if (!file || !secret) {
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
            const address = await AttachmentService.uploadImage(file.buffer, secret, entity, req.file?.originalname);
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
