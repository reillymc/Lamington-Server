import morgan from "morgan";
import { logger } from "../services/index.ts";
import type { CreateMiddleware } from "./middleware.ts";

export const createLoggerMiddleware: CreateMiddleware = () => [
    morgan("dev", {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }),
];
