import morgan from "morgan";

import type { RequestHandler } from "express";
import { logger } from "../services/index.ts";

export const loggerMiddleware: RequestHandler = morgan("dev", {
    stream: {
        write: message => logger.http(message.trim()),
    },
});
