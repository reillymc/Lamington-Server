require("dotenv").config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";

import appRouter from "./server";
import config from "./config";
import { accessLog, AppError, logger } from "./logging";

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
app.use("/", appRouter);

// error handler
app.use((error: AppError, request: Request, response: Response, next: NextFunction) => {
    logger.log({
        level: "error",
        message: error.message,
        request: {
            params: request.params,
            query: request.query,
            body: request.body,
            route: request.originalUrl,
        },
    });

    response.status(error.status || 500);
    return response.json({ error: true, message: error.userMessage });
});

app.listen(config.app.port, () => {
    console.log(`Lamington Server is listening at http://localhost:${config.app.port}`);
});

module.exports = app;
