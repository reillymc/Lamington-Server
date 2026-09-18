import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { Ajv } from "ajv";
import { expect } from "expect";
import {
    collectRequestBodySchemas,
    collectSchemaNodes,
    readOpenApiDocument,
    resolveSchemaRef,
} from "../helpers/schemaNodes.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats") as (
    ajv: Ajv,
) => Ajv;

const collectFormats = (
    value: unknown,
    formats = new Set<string>(),
): Set<string> => {
    if (Array.isArray(value)) {
        for (const item of value) collectFormats(item, formats);
        return formats;
    }

    if (value !== null && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
            if (key === "format" && typeof child === "string") {
                formats.add(child);
            }
            collectFormats(child, formats);
        }
    }

    return formats;
};

describe("OpenAPI schema integrity", () => {
    it("should only use formats that ajv-formats actually validates", () => {
        const ajv = new Ajv();
        addFormats(ajv);
        const knownFormats = new Set(Object.keys(ajv.formats));

        const unknownFormats = [
            ...collectFormats(readOpenApiDocument()),
        ].filter((format) => !knownFormats.has(format));

        expect(unknownFormats).toEqual([]);
    });

    it("should compile every schema with the validator's Ajv options", () => {
        const document = readOpenApiDocument();
        const ajv = new Ajv({
            strict: false,
            strictNumbers: true,
            strictTuples: true,
            allowUnionTypes: false,
            validateSchema: false,
            validateFormats: true,
        });
        addFormats(ajv);

        const failures: string[] = [];

        collectSchemaNodes(document).forEach(({ name, schema }, index) => {
            try {
                ajv.compile({
                    components: document.components ?? {},
                    ...schema,
                    $id: `urn:lamington:integrity:${index}`,
                });
            } catch (error) {
                failures.push(`${name}: ${(error as Error).message}`);
            }
        });

        expect(failures).toEqual([]);
    });

    it("should reject unknown properties in every non-multipart request body", () => {
        const document = readOpenApiDocument();
        const failures: string[] = [];

        for (const { name, contentType, schema } of collectRequestBodySchemas(
            document,
        )) {
            if (contentType.includes("multipart/form-data")) continue;

            const resolved = resolveSchemaRef(schema, document);
            if (resolved === null || typeof resolved !== "object") continue;

            const body = resolved as Record<string, unknown>;
            const isObject = body.type === "object" || !!body.properties;
            if (!isObject) continue;

            const constrained =
                body.unevaluatedProperties === false ||
                body.additionalProperties === false;
            if (!constrained) {
                failures.push(`${name} (${contentType})`);
            }
        }

        expect(failures).toEqual([]);
    });
});
