export type { Logger } from "winston";

interface AppErrorConstructor {
    status?: number;
    code?: string;
    message?: string;
    innerError?: unknown;
}
export class AppError extends Error {
    status: number;
    code: string;
    innerError: unknown;
    constructor({
        status = 500,
        code = "LAMINGTON_ERROR",
        message = "An unknown error occurred",
        innerError,
    }: AppErrorConstructor) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.message = message;
        this.innerError = innerError;
    }
}
