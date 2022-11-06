import express from "express";
import swaggerUI from "swagger-ui-express";
const swaggerDocument = require("../docs/documentation.json");

const router = express.Router();

router.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;
