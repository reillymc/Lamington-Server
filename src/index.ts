import { setupApp } from "./app.ts";
import config from "./config.ts";
import db from "./database/index.ts";
import { logger, printConfig } from "./services/index.ts";

const app = setupApp({ database: db });

const server = app.listen(config.app.port, () => {
    printConfig(config);
    logger.info(
        `Lamington Server Started: http://localhost:${config.app.port}`,
    );
});

process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception, closing server:", err);
    process.exit(1);
});

process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        process.exit(1);
    });
});
