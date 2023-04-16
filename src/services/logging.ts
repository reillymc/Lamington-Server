import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

import { Undefined } from "../utils";

const logPath = "logs";

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

const ErrorLogFileTransport = new transports.DailyRotateFile({
    level: "error",
    filename: "error-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logPath,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
});

const AccessLogFileTransport = new transports.DailyRotateFile({
    level: "http",
    filename: "access-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logPath,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
});

const ConsoleLogTransport =
    process.env.NODE_ENV !== "production"
        ? new transports.Console({
              level: "http",
              format: format.combine(format.colorize(), format.simple()),
          })
        : undefined;

export const logger = createLogger({
    transports: [ErrorLogFileTransport, AccessLogFileTransport, ConsoleLogTransport].filter(Undefined),
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
