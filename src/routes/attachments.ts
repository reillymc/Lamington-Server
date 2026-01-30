import express from "express";
import { v4 } from "uuid";
import type { AppDependencies } from "../appDependencies.ts";
import config from "../config.ts";
import type { KnexDatabase } from "../database/index.ts";
import {
    compressImage,
    constructAttachmentPath,
} from "../services/attachment/helper.ts";
import { InsufficientDataError, UnknownError } from "../services/index.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAttachmentsRouter = ({
    attachmentService,
    attachmentActions,
    database,
}: AppDependencies) =>
    express
        .Router()
        .post<
            routes,
            paths["/attachments/image"]["post"]["parameters"]["path"],
            paths["/attachments/image"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/attachments/image"]["post"]["requestBody"]["content"]["multipart/form-data"],
            paths["/attachments/image"]["post"]["parameters"]["query"]
        >("/attachments/image", async ({ session, files }, res, next) => {
            const { userId } = session;

            if (!Array.isArray(files)) {
                return next(new InsufficientDataError("attachment"));
            }

            const file = files?.find((f) => f.fieldname === "image");

            if (!file) {
                return next(new InsufficientDataError("attachment"));
            }

            try {
                const attachmentId = v4();

                const compressedImage = await compressImage(file.buffer);
                const { uri, uploadPath } = constructAttachmentPath(
                    userId,
                    attachmentId,
                    "jpg",
                );
                await database.transaction(async (trx) => {
                    const [attachmentEntry] = await attachmentActions.save(
                        trx as KnexDatabase,
                        {
                            attachmentId,
                            createdBy: userId,
                            uri,
                        },
                    );

                    if (!attachmentEntry) {
                        throw new Error("Failed to save attachment");
                    }

                    const result = await attachmentService.put(
                        compressedImage,
                        uploadPath,
                    );

                    if (!result) {
                        throw new Error("Failed to upload image");
                    }
                    return res.status(200).json(attachmentEntry);
                });
            } catch (e: unknown) {
                next(new UnknownError(e));
            }
        })
        .use(
            "/attachments/uploads",
            express.static(config.attachments.localUploadDirectory),
        );
