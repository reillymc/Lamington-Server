import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { DefaultAppMiddleware, DefaultAppServices } from "./appDependencies.ts";
import config from "./config.ts";
import type { AppMiddleware } from "./middleware/index.ts";
import type { AppRepositories, Database } from "./repositories/index.ts";
import { createAppRouter } from "./routes/index.ts";
import type { AppServices } from "./services/index.ts";

export interface AppParams {
    database: Database;
    repositories?: Partial<AppRepositories>;
    services?: Partial<AppServices>;
    middleware?: Partial<AppMiddleware>;
}

export const setupApp = ({
    database,
    repositories,
    services,
    middleware,
}: AppParams) =>
    express()
        .use(express.json())
        .use(express.urlencoded({ extended: false }))
        .use(
            cors({
                origin: config.app.allowedOrigin,
                methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
                allowedHeaders: ["Content-Type", "Authorization"],
            }),
        )
        .use(
            helmet({
                contentSecurityPolicy: {
                    directives: { defaultSrc: ["'self'"] },
                },
            }),
        )
        .use(compression())
        .use(
            createAppRouter(
                {
                    ...DefaultAppServices(database, repositories),
                    ...services,
                },
                {
                    ...DefaultAppMiddleware(),
                    ...middleware,
                },
            ),
        );
