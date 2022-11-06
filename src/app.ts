require("dotenv").config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";

import config from "./config";
import { accessLog } from "./services";
import appRouter, { authRouter, docsRouter } from "./routes";
import { authenticationMiddleware, errorMiddleware, notFoundMiddleware } from "./middleware";

const app = express();

// app setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(morgan("common", { stream: accessLog }));
app.use(morgan(config.app.logDetail));

// routers
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));
app.use("/auth", authRouter);
app.use("/v1/", authenticationMiddleware, appRouter);
app.use("/", docsRouter);

/** Catch 404 and forward to error handler */
app.use(notFoundMiddleware);

// error handler
app.use(errorMiddleware);

app.listen(config.app.port, () => {
    console.log(`Lamington Server is listening at http://localhost:${config.app.port}`);
});

module.exports = app;
