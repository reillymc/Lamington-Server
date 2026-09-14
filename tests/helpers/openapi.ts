import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type HttpMethod =
    | "get"
    | "put"
    | "post"
    | "delete"
    | "options"
    | "head"
    | "patch"
    | "trace";

type OpenApiOperation = {
    method: HttpMethod;
    /** Path as declared in the spec, e.g. `/books/{bookId}`. */
    specPath: string;
    /** Concrete request path, e.g. `/v1/books/00000000-...`. */
    requestPath: string;
    isPublic: boolean;
    summary?: string;
    tags: string[];
};

type SecurityRequirement = Record<string, unknown>;

type OperationObject = {
    tags?: string[];
    summary?: string;
    security?: SecurityRequirement[];
};

type PathItemObject = Record<string, OperationObject | undefined>;

type OpenApiDocument = {
    security?: SecurityRequirement[];
    paths?: Record<string, PathItemObject>;
};

const HTTP_METHODS: HttpMethod[] = [
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
];

/**
 * Maps an OpenAPI tag to the test file holding its route tests when the tag
 * does not lowercase directly to the source router file name.
 */
export const TAG_TEST_FILE_OVERRIDES: Record<string, string> = {
    CookList: "cooklists",
};

const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";

const PATH_PARAM_VALUES: Record<string, string> = {
    year: "2023",
    month: "1",
};

const toRequestPath = (specPath: string) =>
    `/v1${specPath.replace(
        /\{(\w+)\}/g,
        (_, name: string) => PATH_PARAM_VALUES[name] ?? PLACEHOLDER_ID,
    )}`;

/**
 * Reads `openapi.yaml` and returns every declared operation together with its
 * resolved auth requirement and a concrete request path.
 *
 * An operation is public when its effective security (operation-level, falling
 * back to the document-level default) is an empty array.
 */
export const readOpenApiOperations = (): OpenApiOperation[] => {
    const openApiPath = path.join(process.cwd(), "openapi.yaml");
    const document = parse(
        fs.readFileSync(openApiPath, "utf-8"),
    ) as OpenApiDocument;

    return Object.entries(document.paths ?? {}).flatMap(
        ([specPath, pathItem]) =>
            HTTP_METHODS.flatMap((method) => {
                const operation = pathItem[method];
                if (!operation) return [];

                const security = operation.security ?? document.security;

                return [
                    {
                        method,
                        specPath,
                        requestPath: toRequestPath(specPath),
                        isPublic:
                            Array.isArray(security) && security.length === 0,
                        summary: operation.summary,
                        tags: operation.tags ?? [],
                    },
                ];
            }),
    );
};
