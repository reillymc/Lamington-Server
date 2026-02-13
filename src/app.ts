import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { AppMiddleware } from "./middleware/index.ts";
import { createAppRouter } from "./routes/index.ts";
import type { AppServices } from "./services/index.ts";

interface AppConfig {
    externalHost: string | undefined;
    allowedOrigin: string | undefined;
    uploadDirectory: string;
}

interface AppParams {
    services: AppServices;
    middleware: AppMiddleware;
    config: AppConfig;
}

export const setupApp = ({ services, middleware, config }: AppParams) =>
    express()
        .use(express.json())
        .use(express.urlencoded({ extended: false }))
        .use(
            cors({
                origin: config.allowedOrigin,
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
