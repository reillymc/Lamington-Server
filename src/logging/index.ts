import { createLogger, format, transports } from "winston";
const rfs = require("rotating-file-stream");

import { Undefined } from "../database/helpers";

const logPath = "logs";

const transportList = [
    new transports.File({ dirname: logPath, filename: "error.log", level: "error", maxsize: 5242880 }),
    process.env.NODE_ENV !== "production"
        ? new transports.Console({
              format: format.combine(format.colorize(), format.simple()),
          })
        : undefined,
].filter(Undefined);

export class AppError extends Error {
    status: number;
    userMessage?: string;
    constructor(status: number, message: string, userMessage?: string) {
        super(message);
        this.status = status;
        this.message = message;
        this.userMessage = userMessage;
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
