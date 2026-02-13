import path from "node:path";
import type { Request } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import jwt, { type JwtPayload } from "jsonwebtoken";
import multer, { type FileFilterCallback } from "multer";
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

const isAccessToken = (
    decoded: string | undefined | JwtPayload,
): decoded is Request["session"] => {
    if (decoded === undefined || typeof decoded === "string") return false;

    if ("userId" in decoded) return true;
    if ("status" in decoded) return true;

    return false;
};

type ValidatorMiddlewareConfig = {
    accessSecret: string;
};

export const createValidatorMiddleware: CreateMiddleware<
    ValidatorMiddlewareConfig
> = ({ accessSecret }) => {
    const verifyAccessToken = (token: string | undefined) => {
        if (!token) {
            throw new UnauthorizedError("No Token Provided");
        }

        const decoded = jwt.verify(token, accessSecret);

        if (!isAccessToken(decoded)) {
            throw new UnauthorizedError("Invalid Token Structure");
        }

        return decoded;
    };

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
            if (e instanceof UnauthorizedError) {
                throw e;
            }
            throw new UnauthorizedError("Access Denied", e);
        }
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
