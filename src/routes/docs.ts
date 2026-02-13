import express from "express";
import swaggerUI from "swagger-ui-express";

import packageJson from "../../package.json" with { type: "json" };
import { openApiSpec } from "../openApiSpec.ts";
import type { CreateRouter } from "./route.ts";

export type DocsRouterConfig = {
    externalHost?: string;
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
        .use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));
};
