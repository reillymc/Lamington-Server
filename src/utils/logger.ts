import type { FieldError } from "./errorTypes.ts";

export type { Logger } from "winston";

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
