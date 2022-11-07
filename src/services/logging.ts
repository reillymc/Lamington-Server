import { createLogger, format, transports } from "winston";
const rfs = require("rotating-file-stream");

import { Undefined } from "../utils";

const logPath = "logs";

const transportList = [
    new transports.File({ dirname: logPath, filename: "error.log", level: "error", maxsize: 5242880 }),
    process.env.NODE_ENV !== "production"
        ? new transports.Console({
              format: format.combine(format.colorize(), format.simple()),
          })
        : undefined,
].filter(Undefined);

interface AppErrorConstructor {
    status?: number;
    message?: string;
    innerError?: unknown;
}
export class AppError {
    status: number;
    message: string;
    innerError: unknown;
    constructor({
        status = 500,
        message = "An unknown error occurred",
        innerError,
    }: AppErrorConstructor) {
        this.status = status;
        this.message = message;
        this.innerError = innerError;
    }
}

export const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    transports: transportList,
});

export const accessLog = rfs.createStream("access.log", {
    interval: "1d",
    path: logPath,
});

export enum MessageAction {
    Create = "creating",
    Read = "reading",
    Update = "updating",
    Delete = "deleting",
}

interface UserMessage {
    entity: string;
    action: MessageAction | string;
}

export const userMessage = ({ action, entity }: UserMessage) => `An error occurred when ${action} your ${entity}.`;
