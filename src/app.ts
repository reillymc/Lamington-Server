import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { LamingtonConfig } from "./config.ts";
import type { AppMiddleware } from "./middleware/index.ts";
import { createAppRouter } from "./routes/index.ts";
import type { AppServices } from "./services/index.ts";

export interface AppParams {
    services: AppServices;
    middleware: AppMiddleware;
    config: LamingtonConfig;
}

export const setupApp = ({ services, middleware, config }: AppParams) =>
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
        .use(createAppRouter(services, middleware, config));
