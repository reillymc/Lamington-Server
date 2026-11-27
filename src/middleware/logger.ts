import morgan from "morgan";
import type { Logger } from "winston";
import type { CreateMiddleware } from "./middleware.ts";

type CreateLoggerMiddlewareConfig = {
    logger: Logger;
};

export const createLoggerMiddleware: CreateMiddleware<
    CreateLoggerMiddlewareConfig
> = ({ logger }) => [
    morgan("short", {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }),
];
