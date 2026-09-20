import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export type AttachmentsRouterConfig = {
    attachmentDirectory?: string;
};

export const createAttachmentsRouter: CreateRouter<
    "attachmentService",
    "rateLimiterControlled",
    AttachmentsRouterConfig
> = ({ attachmentService }, middleware, { attachmentDirectory }) => {
    const router = express
        .Router()
        .post<
            routes,
            paths["/attachments/image"]["post"]["parameters"]["path"],
            paths["/attachments/image"]["post"]["responses"]["200"]["content"]["application/json"],
            paths["/attachments/image"]["post"]["requestBody"]["content"]["multipart/form-data"],
            paths["/attachments/image"]["post"]["parameters"]["query"]
        >(
            "/attachments/image",
            ...middleware.rateLimiterControlled,
            async ({ session, files }, res) => {
                const file = Array.isArray(files)
                    ? files?.find((f) => f.fieldname === "image")
                    : files?.image?.[0];

                const attachmentEntry = await attachmentService.create(
                    session.userId,
                    file,
                );

                return res.status(200).json(attachmentEntry);
            },
        );

    if (attachmentDirectory) {
        router.use(
            "/attachments/image",
            express.static(attachmentDirectory, {
                immutable: true,
                maxAge: "365d",
                setHeaders: (res) => res.type("image/jpeg"),
            }),
        );
    }

    return router;
};
