require("dotenv").config();

import createError from "http-errors";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import swaggerUI from "swagger-ui-express";

import appRouter from "./server";

const rfs = require("rotating-file-stream");
const swaggerDocument = require("./docs/documentation.json");

class HttpException extends Error {
    status: number;
    message: string;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.message = message;
    }
}

let app = express();

// app setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));
app.use(cors());
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
        },
    })
);

let accessLog = rfs.createStream("access.log", {
    interval: "1d",
    path: path.join(__dirname, "log"),
});
app.use(morgan("common", { stream: accessLog }));
morgan.token("req", (req, res) => JSON.stringify(req.headers));
morgan.token("res", (req, res) => {
    const headers: { [header: string]: string | number | string[] | undefined } = {};
    res.getHeaderNames().map(h => (headers[h] = res.getHeader(h)));
    return JSON.stringify(headers);
});
app.use(morgan("dev"));

// routers
app.use("/", appRouter);
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
app.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use((error: HttpException, request: Request, response: Response, next: NextFunction) => {
    // set locals, only providing error in development
    response.locals.message = error.message;
    response.locals.error = request.app.get("env") === "development" ? error : {};

    // render the error page
    response.status(error.status || 500);
});

app.listen(80, () => {
    console.log(`Example app listening at http://localhost}`);
});

module.exports = app;
