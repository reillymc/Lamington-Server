import { describe, it } from "node:test";
import { expect } from "expect";
import { normalizeFieldErrors } from "../../src/utils/errors.ts";

const ERROR_LIMIT = 10;

describe("normalizeFieldErrors", () => {
    it("should return an empty array for empty input", () => {
        expect(normalizeFieldErrors([])).toEqual([]);
    });

    it("should strip the location prefix and split the path into segments", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/servings/count",
                    message: "must be number",
                    errorCode: "type.openapi.validation",
                },
                {
                    path: "/body/ingredients/0/name",
                    message: "must be string",
                    errorCode: "type.openapi.validation",
                },
            ]),
        ).toEqual([
            {
                path: ["servings", "count"],
                location: "body",
                code: "invalidType",
                message: "must be number",
            },
            {
                path: ["ingredients", "0", "name"],
                location: "body",
                code: "invalidType",
                message: "must be string",
            },
        ]);
    });

    it("should keep a key containing a dot as a single segment", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/a.b",
                    message: "must be string",
                    errorCode: "type.openapi.validation",
                },
                {
                    path: "/body/a/b",
                    message: "must be string",
                    errorCode: "type.openapi.validation",
                },
            ]),
        ).toEqual([
            {
                path: ["a.b"],
                location: "body",
                code: "invalidType",
                message: "must be string",
            },
            {
                path: ["a", "b"],
                location: "body",
                code: "invalidType",
                message: "must be string",
            },
        ]);
    });

    it("should map ajv keywords to stable semantic codes", () => {
        const errors = normalizeFieldErrors([
            {
                path: "/body/email",
                message: 'must match format "email"',
                errorCode: "format.openapi.validation",
            },
            {
                path: "/body/password",
                message: "must have required property 'password'",
                errorCode: "required.openapi.validation",
            },
            {
                path: "/body/age",
                message: "must be >= 18",
                errorCode: "minimum.openapi.validation",
            },
            {
                path: "/body/color",
                message: "must be equal to one of the allowed values",
                errorCode: "enum.openapi.validation",
            },
            {
                path: "/body/extra",
                message: "must NOT have additional properties",
                errorCode: "additionalProperties.openapi.validation",
            },
        ]);

        expect(errors.map(({ code }) => code)).toEqual([
            "format",
            "required",
            "min",
            "invalidOption",
            "unknownField",
        ]);
    });

    it("should fall back to the raw keyword for unmapped constraints", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/name",
                    message: "must have at most 3 items",
                    errorCode: "maxItems.openapi.validation",
                },
            ])[0],
        ).toMatchObject({ code: "maxItems" });
    });

    it("should fall back to invalid when no errorCode is provided", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/query/limit",
                    message: "Unknown query parameter 'limit'",
                },
            ])[0],
        ).toEqual({
            path: ["limit"],
            location: "query",
            code: "invalid",
            message: "Unknown query parameter 'limit'",
        });
    });

    it("should recognise query, params and headers locations", () => {
        const errors = normalizeFieldErrors([
            {
                path: "/query/limit",
                message: "bad",
                errorCode: "type.openapi.validation",
            },
            {
                path: "/params/id",
                message: "bad",
                errorCode: "type.openapi.validation",
            },
            {
                path: "/headers/authorization",
                message: "bad",
                errorCode: "type.openapi.validation",
            },
        ]);

        expect(errors).toEqual([
            {
                path: ["limit"],
                location: "query",
                code: "invalidType",
                message: "bad",
            },
            {
                path: ["id"],
                location: "params",
                code: "invalidType",
                message: "bad",
            },
            {
                path: ["authorization"],
                location: "headers",
                code: "invalidType",
                message: "bad",
            },
        ]);
    });

    it("should collapse an anyOf parent when a branch error survives", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/servings",
                    message: "must be null",
                    errorCode: "type.openapi.validation",
                },
                {
                    path: "/body/servings/count",
                    message: "must be number",
                    errorCode: "type.openapi.validation",
                },
                {
                    path: "/body/servings",
                    message: "must match a schema in anyOf",
                    errorCode: "anyOf.openapi.validation",
                },
            ]),
        ).toEqual([
            {
                path: ["servings", "count"],
                location: "body",
                code: "invalidType",
                message: "must be number",
            },
        ]);
    });

    it("should keep an anyOf parent as invalid when no branch error survives", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/servings",
                    message: "must match a schema in anyOf",
                    errorCode: "anyOf.openapi.validation",
                },
            ]),
        ).toEqual([
            {
                path: ["servings"],
                location: "body",
                code: "invalid",
                message: "must match a schema in anyOf",
            },
        ]);
    });

    it("should drop internal composition keywords", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/name",
                    message: 'must pass "if" keyword validation',
                    errorCode: "if.openapi.validation",
                },
                {
                    path: "/body/name",
                    message: 'must match "then" schema',
                    errorCode: "then.openapi.validation",
                },
            ]),
        ).toEqual([]);
    });

    it("should dedupe multiple errors for the same field", () => {
        expect(
            normalizeFieldErrors([
                {
                    path: "/body/email",
                    message: "must be string",
                    errorCode: "type.openapi.validation",
                },
                {
                    path: "/body/email",
                    message: 'must match format "email"',
                    errorCode: "format.openapi.validation",
                },
            ]),
        ).toEqual([
            {
                path: ["email"],
                location: "body",
                code: "invalidType",
                message: "must be string",
            },
        ]);
    });

    it("should not collapse sibling keys that share a dotted string form", () => {
        const errors = normalizeFieldErrors([
            {
                path: "/body/a.b",
                message: "must be string",
                errorCode: "type.openapi.validation",
            },
            {
                path: "/body/a/b",
                message: "must be number",
                errorCode: "type.openapi.validation",
            },
        ]);

        expect(errors).toHaveLength(2);
    });

    it("should not cap error lists at or below the limit", () => {
        const rawErrors = Array.from({ length: ERROR_LIMIT }, (_, index) => ({
            path: `/body/field${index}`,
            message: "must be string",
            errorCode: "type.openapi.validation",
        }));

        expect(normalizeFieldErrors(rawErrors)).toHaveLength(ERROR_LIMIT);
    });

    it("should cap error lists beyond the limit, keeping request order", () => {
        const rawErrors = Array.from(
            { length: ERROR_LIMIT * 3 },
            (_, index) => ({
                path: `/body/field${index}`,
                message: "must be string",
                errorCode: "type.openapi.validation",
            }),
        );

        const errors = normalizeFieldErrors(rawErrors);

        expect(errors).toHaveLength(ERROR_LIMIT);
        expect(errors[0]?.path).toEqual(["field0"]);
        expect(errors[ERROR_LIMIT - 1]?.path).toEqual([
            `field${ERROR_LIMIT - 1}`,
        ]);
    });
});
