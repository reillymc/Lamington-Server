import { setupApp } from "./app.ts";
import config from "./config.ts";
import { logger, printConfig } from "./services/index.ts";

const app = setupApp();

app.listen(config.app.port, () => {
    printConfig(config);
    logger.info(`Lamington Server Started: http://localhost:${config.app.port}`);
});
