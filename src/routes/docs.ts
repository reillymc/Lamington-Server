import { readFileSync } from "node:fs";

import express from "express";
import swaggerUI from "swagger-ui-express";
import { parse } from "yaml";

import packageJson from "../../package.json" with { type: "json" };

const file = readFileSync('./openapi.yaml', 'utf8')
const swaggerDocument = parse(file)

swaggerDocument.info.version = packageJson.version;

const router = express.Router();

router.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;
