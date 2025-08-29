import morgan from "morgan";

import { logger } from "../services/index.ts";

export const loggerMiddleware = morgan("dev", {
    stream: {
        write: message => logger.http(message.trim()),
    },
});
