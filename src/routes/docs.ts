import { readFileSync } from "node:fs";

import express from "express";
import swaggerUI from "swagger-ui-express";
import { parse } from "yaml";

import packageJson from "../../package.json" with { type: "json" };
import config from "../config.ts";
import type { CreateRouter } from "./route.ts";

const file = readFileSync("./openapi.yaml", "utf8");
const swaggerDocument = parse(file);

swaggerDocument.info.version = packageJson.version;

if (config.app.externalHost) {
    swaggerDocument.servers = [{ url: `${config.app.externalHost}/v1` }];
}

export const createDocsRouter: CreateRouter = () =>
    express.Router().use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));
