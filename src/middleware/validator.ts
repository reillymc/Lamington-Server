import path from "node:path";
import type { Request } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import jwt from "jsonwebtoken";
import multer, { type FileFilterCallback } from "multer";
import { openApiSpec } from "../openApiSpec.ts";
import { verifyAccessToken } from "../utils/token.ts";
import {
    type CreateMiddleware,
    type Middleware,
    UnauthorizedError,
    ValidationError,
} from "./middleware.ts";

const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

const fileFilter = (
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

type ValidatorMiddlewareConfig = {
    accessSecret: string;
};

export const createValidatorMiddleware: CreateMiddleware<
    ValidatorMiddlewareConfig
> = ({ accessSecret }) => {
    const bearerAuthValidator = (request: Request): boolean => {
        const authHeader = request.headers.authorization;

        try {
            const token = authHeader?.substring(7, authHeader.length);
            const decoded = verifyAccessToken(accessSecret, token);

            if (
                decoded.status === "P" ||
                decoded.status === "B" ||
                decoded.status === "D"
            ) {
                throw new UnauthorizedError("Access Denied");
            }

            request.session = decoded;
            return true;
        } catch (e: unknown) {
            if (e instanceof TokenExpiredError) {
                throw new UnauthorizedError("Token Expired");
            }
            if (e instanceof JsonWebTokenError) {
                throw new UnauthorizedError("Invalid Token");
            }
            if (e instanceof NotBeforeError) {
                throw new UnauthorizedError("Token Not Active");
            }
            if (e instanceof UnauthorizedError) {
                throw e;
            }
            throw new UnauthorizedError("Access Denied", e);
        }
    };

    const openApiValidatorMiddlewares = OpenApiValidator.middleware({
        apiSpec: openApiSpec,
        validateRequests: {
            allErrors: process.env.NODE_ENV !== "production",
            allowUnknownQueryParameters: false,
            removeAdditional: true,
        },
        validateApiSpec: true,
        validateSecurity: {
            handlers: {
                bearerAuth: bearerAuthValidator,
            },
        },
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
            limits: {
                fileSize: 5 * 1024 * 1024,
                files: 1,
                fields: 10,
                fieldSize: 1024 * 1024,
                fieldNameSize: 100,
            },
        },
    });

    return openApiValidatorMiddlewares.map(
        (middleware): Middleware =>
            async (req, res, next) => {
                await middleware(req, res, (error) => {
                    if (error) {
                        return next(new ValidationError(error));
                    }
                    next();
                });
            },
    );
};
