import express from "express";
import type { CreateRouter } from "./route.ts";
import type { paths, routes } from "./spec/index.ts";

export const createAttachmentsRouter: CreateRouter<
    "attachmentService",
    "rateLimiterControlled"
> = ({ attachmentService }, middleware) =>
    express
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
        )
        .get<
            routes,
            paths["/attachments/image/{attachmentId}"]["get"]["parameters"]["path"],
            paths["/attachments/image/{attachmentId}"]["get"]["responses"]["200"]["content"]["image/*"],
            paths["/attachments/image/{attachmentId}"]["get"]["requestBody"],
            paths["/attachments/image/{attachmentId}"]["get"]["parameters"]["query"]
        >("/attachments/image/:attachmentId", async ({ params }, res) => {
            const location = await attachmentService.read(params.attachmentId);

            if (location.type === "redirect") {
                return res.redirect(301, location.url);
            }

            return res.type("image/jpeg").sendFile(location.path, (error) => {
                if (error && !res.headersSent) {
                    res.sendStatus(404);
                }
            });
        });
