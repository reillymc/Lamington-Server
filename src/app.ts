import cors from "cors";
import express from "express";
import helmet from "helmet";

import {
    DefaultAppServices,
    type PartialAppDependencies,
} from "./appDependencies.ts";
import type { AppRepositories, Database } from "./repositories/index.ts";
import { createAppRouter } from "./routes/index.ts";

interface AppParams {
    database?: Database;
    services?: PartialAppDependencies;
    repositories?: Partial<AppRepositories>;
}

export const setupApp = ({ database, repositories, services }: AppParams) =>
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
        .use(
            createAppRouter({
                ...DefaultAppServices(database, repositories),
                ...services,
            }),
        );
