import express from "express";
import swaggerUI from "swagger-ui-express";
import packageJson from "../../package.json" with { type: "json" };
import swaggerDocument from "../docs/documentation.json" with { type: "json" };

swaggerDocument.info.version = packageJson.version;

const router = express.Router();

router.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;
