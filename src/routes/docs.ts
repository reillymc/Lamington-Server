import express from "express";
import swaggerUI from "swagger-ui-express";
import { version } from "../../package.json";
import swaggerDocument from "../docs/documentation.json";

swaggerDocument.info.version = version;

const router = express.Router();

router.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;
