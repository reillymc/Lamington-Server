import express from "express";
import { v4 } from "uuid";

import { uploadImageMiddleware } from "../middleware/index.ts";
import { AppError } from "../services/index.ts";
import {
    AttachmentEndpoint,
    type PostImageAttachmentRequestParams,
    type PostImageAttachmentResponse,
} from "./spec/index.ts";
import { compressImage, constructAttachmentPath } from "../services/attachment/helper.ts";
import config from "../config.ts";
import type { AppDependencies } from "../appDependencies.ts";
import type { KnexDatabase } from "../database/index.ts";

export const createAttachmentsRouter = ({ attachmentService, attachmentActions, database }: AppDependencies) => {
    const router = express.Router();

    // upload image
    router.post<PostImageAttachmentRequestParams, PostImageAttachmentResponse>(
        AttachmentEndpoint.postImage,
        uploadImageMiddleware,
        async ({ file, session }, res, next) => {
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

            try {
                const attachmentId = v4();

                if (!["local", "s3"].includes(config.attachments.storageService)) {
                    throw new Error("Invalid storage service");
                }

                const compressedImage = await compressImage(file.buffer);
                const { uri, uploadPath } = constructAttachmentPath(userId, attachmentId, "jpg");
                await database.transaction(async trx => {
                    const [attachmentEntry] = await attachmentActions.save(trx as KnexDatabase, {
                        attachmentId,
                        createdBy: userId,
                        uri,
                    });

                    if (!attachmentEntry) {
                        throw new Error("Failed to save attachment");
                    }

                    const result = await attachmentService.put(compressedImage, uploadPath);

                    if (!result) {
                        throw new Error("Failed to upload image");
                    }
                    return res.json({
                        error: false,
                        data: attachmentEntry,
                    });
                });
            } catch (e: unknown) {
                next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
            }
        }
    );
    return router;
};
