import { AppError } from "../../utils/errors.ts";

export class ExtractorRequestError extends AppError {
    constructor(message = "Invalid extraction request", innerError?: unknown) {
        super({
            status: 400,
            code: "INVALID_REQUEST",
            message,
            innerError,
        });
    }
}

export class ExtractorRecipeError extends AppError {
    constructor(
        message = "Recipe could not be processed",
        innerError?: unknown,
    ) {
        super({
            status: 422,
            code: "INVALID_RECIPE",
            message,
            innerError,
        });
    }
}

export class ExtractorFailureError extends AppError {
    constructor(
        message = "Failed to extract recipe from the provided URL",
        innerError?: unknown,
    ) {
        super({
            status: 502,
            code: "EXTRACTION_FAILED",
            message,
            innerError,
        });
    }
}

export class ExtractorUnavailableError extends AppError {
    constructor(
        message = "Recipe extractor is unavailable",
        innerError?: unknown,
    ) {
        super({
            status: 503,
            code: "EXTRACTOR_UNAVAILABLE",
            message,
            innerError,
        });
    }
}
