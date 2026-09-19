import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { Ajv } from "ajv";
import { expect } from "expect";
import {
    collectSchemaNodes,
    readOpenApiDocument,
    stripUnvalidatedFormats,
} from "../helpers/schemaNodes.ts";

/**
 * Ajv's security guidance warns that some JSON Schema keywords can cause very
 * slow validation of untrusted data, and that the documented mitigations only
 * hold if `allErrors` is disabled:
 * https://ajv.js.org/security.html
 *
 * We intentionally run `allErrors: true` in production so clients receive every
 * failed field at once. That is only safe while request schemas stay free of
 * expensive keywords. This test enforces the invariant by validating every
 * schema in `openapi.yaml` against Ajv's `json-schema-secure` meta-schema, so a
 * future `pattern`/`patternProperties`/`uniqueItems` addition fails CI unless it
 * carries the required mitigation.
 */
const require = createRequire(import.meta.url);
const secureSchema = require("ajv/lib/refs/json-schema-secure.json");

describe("OpenAPI schema security", () => {
    const isSecure = new Ajv({
        strictTypes: false,
        allErrors: true,
    }).compile(secureSchema);

    it("should keep every schema safe for allErrors validation of untrusted input", () => {
        const failures: string[] = [];

        for (const { name, schema } of collectSchemaNodes(
            readOpenApiDocument(),
        )) {
            const sanitized = stripUnvalidatedFormats(schema) as Record<
                string,
                unknown
            >;

            if (!isSecure(sanitized)) {
                const details = (isSecure.errors ?? [])
                    .map(
                        (error) =>
                            `${error.instancePath || "/"} ${error.message}`,
                    )
                    .join("; ");
                failures.push(`${name}: ${details}`);
            }
        }

        expect(failures).toEqual([]);
    });
});
