import { describe, it } from "node:test";
import { expect } from "expect";
import express from "express";
import request from "supertest";
import { createErrorHandlerMiddleware } from "../../src/middleware/errorHandler.ts";
import { ValidationError } from "../../src/utils/errors.ts";
import { silentLogger } from "../helpers/setup.ts";

const buildApp = (error: unknown) => {
    const app = express();
    app.get("/", (_request, _response, next) => next(error));
    app.use(createErrorHandlerMiddleware({ logger: silentLogger })[0]!);
    return app;
};

describe("Error handler middleware", () => {
    it("should surface field errors for a validation failure", async () => {
        const error = new ValidationError({
            status: 400,
            message: "request/body must have required property 'name'",
            errors: [
                {
                    path: "/body/name",
                    errorCode: "required.openapi.validation",
                    message: "must have required property 'name'",
                },
            ],
        });

        const res = await request(buildApp(error)).get("/");

        expect(res.statusCode).toEqual(400);
        expect(res.body).toMatchObject({
            error: true,
            code: "VALIDATION_FAILED",
            message: "Some fields are not valid",
        });
        expect(res.body.fieldErrors).toEqual([
            {
                path: ["name"],
                location: "body",
                code: "required",
                message: "must have required property 'name'",
            },
        ]);
    });

    it("should keep the original message when no field errors can be derived", async () => {
        const error = new ValidationError({
            status: 400,
            message: "request/body must match schema",
            errors: [
                {
                    path: "/body",
                    errorCode: "if.openapi.validation",
                    message: 'must match "then" schema',
                },
            ],
        });

        const res = await request(buildApp(error)).get("/");

        expect(res.statusCode).toEqual(400);
        expect(res.body).toMatchObject({
            error: true,
            code: "VALIDATION_FAILED",
            message: "request/body must match schema",
        });
        expect(res.body.fieldErrors).toBeUndefined();
    });
});
