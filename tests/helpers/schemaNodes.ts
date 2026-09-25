import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/** Formats that ajv-formats does not actually validate, so no regex runs. */
const UNVALIDATED_FORMATS = new Set(["binary"]);

const HTTP_METHODS = new Set([
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
]);

type SchemaNode = {
    /** Human-readable location of the schema within `openapi.yaml`. */
    name: string;
    schema: Record<string, unknown>;
};

type MediaTypeObject = { schema?: unknown };

type OperationObject = {
    parameters?: { name?: string; schema?: unknown }[];
    requestBody?: { content?: Record<string, MediaTypeObject> };
    responses?: Record<string, { content?: Record<string, MediaTypeObject> }>;
};

type OpenApiDocument = {
    components?: { schemas?: Record<string, unknown> };
    paths?: Record<string, Record<string, unknown>>;
};

export const readOpenApiDocument = (): OpenApiDocument =>
    parse(
        readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf-8"),
    ) as OpenApiDocument;

const addContentSchemas = (
    nodes: SchemaNode[],
    name: string,
    content: Record<string, MediaTypeObject> | undefined,
) => {
    for (const [contentType, mediaType] of Object.entries(content ?? {})) {
        if (mediaType?.schema) {
            nodes.push({
                name: `${name} ${contentType}`,
                schema: mediaType.schema as Record<string, unknown>,
            });
        }
    }
};

/**
 * Walks `openapi.yaml` and returns every schema node (component schemas plus
 * operation parameters and request/response bodies).
 *
 * Nodes are collected individually because the schemas still contain `$ref`s,
 * which Ajv's `json-schema-secure` meta-schema does not follow.
 */
export const collectSchemaNodes = (document: OpenApiDocument): SchemaNode[] => {
    const nodes: SchemaNode[] = [];

    for (const [name, schema] of Object.entries(
        document.components?.schemas ?? {},
    )) {
        nodes.push({
            name: `components.schemas.${name}`,
            schema: schema as Record<string, unknown>,
        });
    }

    for (const [specPath, pathItem] of Object.entries(document.paths ?? {})) {
        for (const [method, rawOperation] of Object.entries(pathItem ?? {})) {
            if (!HTTP_METHODS.has(method) || !rawOperation) continue;

            const operation = rawOperation as OperationObject;
            const operationName = `${method.toUpperCase()} ${specPath}`;

            operation.parameters?.forEach((parameter, index) => {
                if (parameter.schema) {
                    nodes.push({
                        name: `${operationName} parameter[${index}] ${parameter.name ?? ""}`.trim(),
                        schema: parameter.schema as Record<string, unknown>,
                    });
                }
            });

            addContentSchemas(
                nodes,
                `${operationName} requestBody`,
                operation.requestBody?.content,
            );

            for (const [status, response] of Object.entries(
                operation.responses ?? {},
            )) {
                addContentSchemas(
                    nodes,
                    `${operationName} response ${status}`,
                    response?.content,
                );
            }
        }
    }

    return nodes;
};

type RequestBodySchema = {
    /** Human-readable location of the operation within `openapi.yaml`. */
    name: string;
    /** Request media type, e.g. `application/json` or `multipart/form-data`. */
    contentType: string;
    schema: unknown;
};

/** Returns each request body schema together with its operation and media type. */
export const collectRequestBodySchemas = (
    document: OpenApiDocument,
): RequestBodySchema[] => {
    const bodies: RequestBodySchema[] = [];

    for (const [specPath, pathItem] of Object.entries(document.paths ?? {})) {
        for (const [method, rawOperation] of Object.entries(pathItem ?? {})) {
            if (!HTTP_METHODS.has(method) || !rawOperation) continue;

            const operation = rawOperation as OperationObject;
            for (const [contentType, mediaType] of Object.entries(
                operation.requestBody?.content ?? {},
            )) {
                if (mediaType?.schema) {
                    bodies.push({
                        name: `${method.toUpperCase()} ${specPath}`,
                        contentType,
                        schema: mediaType.schema,
                    });
                }
            }
        }
    }

    return bodies;
};

/** Resolves an internal `#/...` JSON pointer against the OpenAPI document. */
export const resolveSchemaRef = (
    schema: unknown,
    document: OpenApiDocument,
): unknown => {
    if (
        schema === null ||
        typeof schema !== "object" ||
        !("$ref" in schema) ||
        typeof (schema as { $ref?: unknown }).$ref !== "string"
    ) {
        return schema;
    }

    const ref = (schema as { $ref: string }).$ref;
    if (!ref.startsWith("#/")) return schema;

    return ref
        .slice(2)
        .split("/")
        .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
        .reduce<unknown>(
            (node, key) =>
                node !== null && typeof node === "object"
                    ? (node as Record<string, unknown>)[key]
                    : undefined,
            document,
        );
};

/**
 * Removes `format` values that ajv-formats does not validate, so the secure
 * meta-schema's blanket "format requires maxLength" rule only applies to formats
 * that can actually execute a regex.
 */
export const stripUnvalidatedFormats = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripUnvalidatedFormats);

    if (value !== null && typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            if (
                key === "format" &&
                typeof child === "string" &&
                UNVALIDATED_FORMATS.has(child)
            ) {
                continue;
            }
            result[key] = stripUnvalidatedFormats(child);
        }
        return result;
    }

    return value;
};
