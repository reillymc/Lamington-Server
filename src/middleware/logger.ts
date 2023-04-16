import morgan from "morgan";

import { logger } from "../services";

export const loggerMiddleware = morgan("dev", {
    stream: {
        write: message => logger.http(message.trim()),
    },
});
