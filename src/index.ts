import app from "./app";
import config from "./config";
import { logger, printConfig } from "./services";

app.listen(config.app.port, () => {
    printConfig(config);
    logger.info(`Lamington Server Started: http://localhost:${config.app.port}`);
});
