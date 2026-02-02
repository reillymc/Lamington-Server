import express from "express";
import config from "../config.ts";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAttachmentsRouter: CreateRouter<"attachmentService"> = ({
    attachmentService,
}) =>
    express
        .Router()
        .post<
            routes,
            paths["/attachments/image"]["post"]["parameters"]["path"],
            paths["/attachments/image"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/attachments/image"]["post"]["requestBody"]["content"]["multipart/form-data"],
            paths["/attachments/image"]["post"]["parameters"]["query"]
        >("/attachments/image", async ({ session, files }, res) => {
            const file = Array.isArray(files)
                ? files?.find((f) => f.fieldname === "image")
                : files?.image?.[0];

            const attachmentEntry = await attachmentService.create(
                session.userId,
                file,
            );

            return res.status(200).json(attachmentEntry);
        })
        .use(
            "/attachments/image" satisfies routes,
            express.static(config.attachments.localUploadDirectory),
        );
