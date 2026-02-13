import { readFileSync } from "node:fs";

import express from "express";
import swaggerUI from "swagger-ui-express";
import { parse } from "yaml";

import packageJson from "../../package.json" with { type: "json" };
import type { CreateRouter } from "./route.ts";

export type DocsRouterConfig = {
    externalHost?: string;
};

export const createDocsRouter: CreateRouter<never, never, DocsRouterConfig> = ({
    externalHost,
}) => {
    const file = readFileSync("./openapi.yaml", "utf8");
    const swaggerDocument = parse(file);

    swaggerDocument.info.version = packageJson.version;

    if (externalHost) {
        swaggerDocument.servers = [{ url: `${externalHost}/v1` }];
    }

    return express
        .Router()
        .use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));
};
