import type { FieldError } from "./fieldErrorTypes.ts";

interface AppErrorConstructor {
    status?: number;
    code?: string;
    message?: string;
    innerError?: unknown;
    fieldErrors?: FieldError[];
}

export class AppError extends Error {
    status: number;
    code: string;
    innerError: unknown;
    fieldErrors?: FieldError[];
    constructor({
        status = 500,
        code = "LAMINGTON_ERROR",
        message = "An unknown error occurred",
        innerError,
        fieldErrors,
    }: AppErrorConstructor) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.message = message;
        this.innerError = innerError;
        this.fieldErrors = fieldErrors;
    }
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

export class ExtractionLimitError extends AppError {
    constructor(reason = "Recipe content exceeds extraction limits") {
        super({
            status: 400,
            code: "EXTRACTION_LIMIT",
            message: reason,
        });
    }
}

export class InvalidImageUrlError extends AppError {
    constructor(
        reason = "The image URL could not be fetched",
        innerError?: unknown,
    ) {
        super({
            status: 400,
            code: "INVALID_IMAGE_URL",
            message: reason,
            innerError,
        });
    }
}

export class UnsupportedMediaTypeError extends AppError {
    constructor(reason = "Unsupported media type") {
        super({
            status: 415,
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: reason,
        });
    }
}
