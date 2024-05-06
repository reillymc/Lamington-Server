require("dotenv").config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import config from "./config";
import { authenticationMiddleware, errorMiddleware, loggerMiddleware, notFoundMiddleware } from "./middleware";
import appRouter, { authRouter, docsRouter } from "./routes";
import { attachmentEndpoint, authEndpoint, uploadDirectory } from "./routes/spec";

const app = express();

// app setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));

// logging
app.use(loggerMiddleware);

// routers
if (config.attachments.storageService === "local" || process.env.NODE_ENV !== "production") {
    app.use(`/v1${attachmentEndpoint}/${uploadDirectory}`, express.static(uploadDirectory));
}
app.use(`/v1${authEndpoint}`, authRouter);
app.use("/v1/", authenticationMiddleware, appRouter);
app.use("/", docsRouter);

// Catch 404 and forward to error handler
app.use(notFoundMiddleware);

// error handler
app.use(errorMiddleware);

export default app;
