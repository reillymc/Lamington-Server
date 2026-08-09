import morgan from "morgan";
import type { Logger } from "../utils/logger.ts";
import type { CreateMiddleware } from "./middleware.ts";

type CreateLoggerMiddlewareConfig = {
    logger: Logger;
};

export const createLoggerMiddleware: CreateMiddleware<
    CreateLoggerMiddlewareConfig
> = ({ logger }) => [
    morgan("dev", {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }),
];
