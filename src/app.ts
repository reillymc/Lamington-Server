import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Knex } from "knex";

import config from "./config.ts";
import { authenticationMiddleware, errorMiddleware, loggerMiddleware, notFoundMiddleware } from "./middleware/index.ts";
import { appRouter, authRouter, docsRouter } from "./routes/index.ts";
import { attachmentEndpoint, authEndpoint, uploadDirectory } from "./routes/spec/index.ts";
import db from "./database/index.ts";

// TODO: Knex.Transaction
export const setupApp = (trx?: Knex) => {
    const app = express();

    // app setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors());
    app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));

    // logging
    app.use(loggerMiddleware);

    // routers
    if (config.attachments.storageService === "local" || process.env.NODE_ENV !== "production") {
        app.use(`/v1${attachmentEndpoint}/${uploadDirectory}`, express.static(uploadDirectory));
    }
    app.use(`/v1${authEndpoint}`, authRouter);
    app.use("/v1/", authenticationMiddleware, appRouter(trx ?? db));
    app.use("/", docsRouter);

    // Catch 404 and forward to error handler
    app.use(notFoundMiddleware);

    // error handler
    app.use(errorMiddleware);

    return app;
};
