import { AppError } from "./logger.ts";

export type ErrorLocation = "body" | "query" | "params" | "headers";

export interface FieldError {
    path: string[];
    location?: ErrorLocation;
    code: string;
    message: string;
}

export class UnauthorizedError extends AppError {
    constructor(reason = "Unauthorised", innerError?: unknown) {
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message: reason,
            innerError,
        });
    }
}

export class PayloadTooLargeError extends AppError {
    constructor(reason = "File too large") {
        super({
            status: 413,
            code: "PAYLOAD_TOO_LARGE",
            message: reason,
        });
    }
}

type RawValidationError = {
    path?: unknown;
    message?: unknown;
    errorCode?: unknown;
};

const ERROR_LOCATIONS = ["body", "query", "params", "headers"] as const;

const MAX_VALIDATION_ERRORS = 10;

const ERROR_CODE_MAP: Record<string, string> = {
    required: "required",
    format: "format",
    minLength: "minLength",
    maxLength: "maxLength",
    minimum: "min",
    exclusiveMinimum: "min",
    maximum: "max",
    exclusiveMaximum: "max",
    pattern: "pattern",
    enum: "invalidOption",
    const: "invalidOption",
    type: "invalidType",
    additionalProperties: "unknownField",
    unevaluatedProperties: "unknownField",
    dependentRequired: "missingDependency",
    uniqueItems: "duplicate",
    minItems: "minItems",
    maxItems: "maxItems",
    anyOf: "invalid",
    oneOf: "invalid",
    not: "invalid",
};

const IGNORED_KEYWORDS = new Set(["if", "then", "else"]);
const COMPOSITION_KEYWORDS = new Set(["anyOf", "oneOf", "not"]);

const decodePointerSegment = (segment: string): string =>
    segment.replace(/~1/g, "/").replace(/~0/g, "~");

const parsePath = (
    path: string,
): { location?: ErrorLocation; segments: string[] } => {
    const segments = path
        .split("/")
        .filter((segment) => segment.length > 0)
        .map(decodePointerSegment);

    const [head, ...rest] = segments;
    const location = ERROR_LOCATIONS.includes(head as ErrorLocation)
        ? (head as ErrorLocation)
        : undefined;

    return {
        location,
        segments: location ? rest : segments,
    };
};

const keywordFromCode = (errorCode: unknown): string | undefined => {
    if (typeof errorCode !== "string") return undefined;
    return errorCode.replace(/\.openapi\.validation$/, "");
};

const codeFromKeyword = (keyword: string | undefined): string => {
    if (!keyword) return "invalid";
    return ERROR_CODE_MAP[keyword] ?? keyword;
};

/**
 * Turns the raw items emitted by `express-openapi-validator` into a stable,
 * client-facing list of field errors.
 *
 * Ajv composition keywords (`anyOf`/`oneOf`) produce a parent error alongside
 * the errors of each failed branch. We drop the parent when a surviving branch
 * error exists so a field surfaces once, and fall back to a generic `invalid`
 * code when the parent is the only signal available.
 */
export const normalizeFieldErrors = (
    rawErrors: readonly unknown[],
): FieldError[] => {
    const parsed = rawErrors
        .map((raw) => {
            if (raw === null || typeof raw !== "object") return undefined;

            const item = raw as RawValidationError;
            const pointer = typeof item.path === "string" ? item.path : "";
            const message =
                typeof item.message === "string" ? item.message : "";
            const keyword = keywordFromCode(item.errorCode);
            const { location, segments } = parsePath(pointer);

            return { pointer, segments, location, keyword, message };
        })
        .filter((error): error is NonNullable<typeof error> => !!error)
        .filter(
            (error) => !(error.keyword && IGNORED_KEYWORDS.has(error.keyword)),
        )
        .filter(
            (error) =>
                !(error.keyword === "type" && error.message === "must be null"),
        );

    const seenFields = new Set<string>();
    const fieldErrors: FieldError[] = [];

    for (const error of parsed) {
        const isComposition =
            !!error.keyword && COMPOSITION_KEYWORDS.has(error.keyword);
        const hasDescendantError = parsed.some(
            (other) =>
                other !== error &&
                other.pointer.startsWith(`${error.pointer}/`),
        );

        if (isComposition && hasDescendantError) continue;

        const key = JSON.stringify([error.location ?? "", error.segments]);
        if (seenFields.has(key)) continue;
        seenFields.add(key);

        fieldErrors.push({
            path: error.segments,
            location: error.location,
            code: codeFromKeyword(error.keyword),
            message: error.message,
        });
    }

    return fieldErrors.slice(0, MAX_VALIDATION_ERRORS);
};

export class ValidationError extends AppError {
    fieldErrors: FieldError[];
    constructor(innerError: unknown) {
        const innerErrorObject =
            innerError !== null && typeof innerError === "object"
                ? innerError
                : undefined;

        const innerErrorStatus =
            innerErrorObject &&
            "status" in innerErrorObject &&
            typeof innerErrorObject.status === "number"
                ? innerErrorObject.status
                : undefined;

        const innerErrorString =
            innerErrorObject &&
            "message" in innerErrorObject &&
            typeof innerErrorObject.message === "string"
                ? innerErrorObject.message
                : undefined;

        const innerErrorItems =
            innerErrorObject &&
            "errors" in innerErrorObject &&
            Array.isArray(innerErrorObject.errors)
                ? innerErrorObject.errors
                : undefined;

        super({
            status: innerErrorStatus ?? 500,
            code: "VALIDATION_FAILED",
            message: innerErrorString ?? "An unknown validation error occurred",
            innerError,
        });

        this.fieldErrors = innerErrorItems
            ? normalizeFieldErrors(innerErrorItems)
            : [];
    }
}
