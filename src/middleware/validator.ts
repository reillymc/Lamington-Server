import path from "node:path";
import type { Request, RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import jwt from "jsonwebtoken";
import multer, { type FileFilterCallback } from "multer";
import { UnauthorizedError, verifyAccessToken } from "../services/index.ts";
import { ValidationError } from "../services/logging.ts";

const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

const bearerAuthValidator = (request: Request): boolean => {
    const authHeader = request.headers.authorization;

    try {
        const token = authHeader?.substring(7, authHeader.length);
        const decoded = verifyAccessToken(token);

        if (decoded.status === "P" || decoded.status === "B") {
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
        throw e;
    }
};

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

const openApiValidatorMiddlewares = OpenApiValidator.middleware({
    apiSpec: "./openapi.yaml",
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
