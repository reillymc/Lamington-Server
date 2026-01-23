import type { RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import { ValidationError } from "../services/logging.ts";

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
});

export const validationMiddleware: RequestHandler[] =
    openApiValidatorMiddlewares.map(
        (middleware): RequestHandler =>
            async (req, res, next) => {
                await middleware(req, res, (error) => {
                    if (error) {
                        return next(new ValidationError(error));
                    }
                    next();
                });
            },
    );
