import { AppError } from "./logger.ts";

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

export class ValidationError extends AppError {
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

        super({
            status: innerErrorStatus ?? 500,
            message: innerErrorString ?? "An unknown validation error occurred",
            innerError,
        });
    }
}
