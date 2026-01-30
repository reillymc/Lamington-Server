import path from "node:path";
import type { Request, RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import multer, { type FileFilterCallback } from "multer";
import { ValidationError } from "../services/logging.ts";

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

export const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
) => {
    const extension = path.extname(file.originalname ?? "").toLowerCase();
    const validFile =
        acceptedExtensions.includes(extension) ||
        acceptedMimeTypes.includes(file.mimetype);
    callback(null, validFile);
};

export const openApiValidatorMiddlewares = OpenApiValidator.middleware({
    apiSpec: "./openapi.yaml",
    validateRequests: {
        allErrors: process.env.NODE_ENV !== "production",
        allowUnknownQueryParameters: false,
        removeAdditional: true,
    },
    validateApiSpec: true,
    validateSecurity: false,
    validateFormats: true,
    ajvFormats: {
        mode: "full",
    },
    validateResponses: {
        allErrors: process.env.NODE_ENV !== "production",
        removeAdditional: true,
    },
    fileUploader: {
        storage: multer.memoryStorage(),
        fileFilter,
        limits: {},
    },
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI middleware incompatible with strictly typed routes
type Handler = RequestHandler<any, any, unknown, any>;

export const validationMiddleware: Handler[] = openApiValidatorMiddlewares.map(
    (middleware): Handler =>
        async (req, res, next) => {
            await middleware(req, res, (error) => {
                if (error) {
                    return next(new ValidationError(error));
                }
                next();
            });
        },
);
