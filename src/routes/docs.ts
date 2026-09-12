import express, { type RequestHandler } from "express";
import swaggerUI from "swagger-ui-express";

import packageJson from "../../package.json" with { type: "json" };
import { openApiSpec } from "../openApiSpec.ts";
import type { CreateRouter } from "./route.ts";

export type DocsRouterConfig = {
    externalHost?: string;
};

const createDocsContentSecurityPolicyMiddleware =
    (externalHost?: string): RequestHandler =>
    (_req, res, next) => {
        res.setHeader(
            "Content-Security-Policy",
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                externalHost
                    ? `connect-src 'self' ${externalHost}`
                    : "connect-src 'self'",
                "font-src 'self' data:",
                "object-src 'none'",
                "base-uri 'self'",
                "frame-ancestors 'self'",
            ].join("; "),
        );
        next();
    };

export const createDocsRouter: CreateRouter<never, never, DocsRouterConfig> = (
    config,
) => {
    const swaggerDocument = {
        ...openApiSpec,
        info: {
            ...openApiSpec.info,
            version: packageJson.version,
        },
        servers: config.externalHost
            ? [{ url: `${config.externalHost}/v1` }]
            : openApiSpec.servers,
    };

    return express
        .Router()
        .use(createDocsContentSecurityPolicyMiddleware(config.externalHost))
        .use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));
};
