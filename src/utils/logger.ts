export { Logger } from "winston";

interface AppErrorConstructor {
    status?: number;
    code?: string;
    message?: string;
    innerError?: unknown;
}
export class AppError {
    status: number;
    code: string;
    message: string;
    innerError: unknown;
    constructor({
        status = 500,
        code = "LAMINGTON_ERROR",
        message = "An unknown error occurred",
        innerError,
    }: AppErrorConstructor) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.innerError = innerError;
    }
}
