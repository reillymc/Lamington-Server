import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { AppMiddleware } from "./middleware/index.ts";
import { createAppRouter } from "./routes/index.ts";
import type { AppServices } from "./services/index.ts";

export interface AppConfig {
    externalHost: string | undefined;
    allowedOrigin: string | undefined;
    uploadDirectory: string;
    assetDirectory: string;
    trustProxyHops: number;
}

interface AppParams {
    services: AppServices;
    middleware: AppMiddleware;
    config: AppConfig;
}

export const setupApp = ({ services, middleware, config }: AppParams) =>
    express()
        .set("trust proxy", config.trustProxyHops)
        .use(express.json({ limit: "1mb" }))
        .use(express.urlencoded({ extended: false, limit: "1mb" }))
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
                    useDefaults: true,
                    directives: {
                        defaultSrc: ["'self'"],
                        upgradeInsecureRequests: null,
                    },
                },
            }),
        )
        .use(compression())
        .use(createAppRouter(services, middleware, config));
