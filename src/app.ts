const createError = require('http-errors');
require('dotenv').config()
import express, { Request, Response, NextFunction } from "express";
import path from 'path';
const cookieParser = require('cookie-parser');
import morgan from 'morgan';
const usersRouter = require('./routes/users');
const choresRouter = require('./routes/chores');
const mealsRouter = require('./routes/meals');
const attachmentsRouter = require('./routes/attachments');
const rfs = require('rotating-file-stream')
import swaggerUI from 'swagger-ui-express';
const swaggerDocument = require('./docs/documentation.json');
import cors from 'cors';
import helmet from 'helmet';

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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
app.use(cors());
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"]
    }
}))

let accessLog = rfs.createStream('access.log', {
    interval: '1d',
    path: path.join(__dirname, 'log')
})
app.use(morgan('common', { stream: accessLog }));
morgan.token('req', (req, res) => JSON.stringify(req.headers))
morgan.token('res', (req, res) => {
    const headers: { [header: string]: string | number | string[] | undefined } = {}
    res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
    return JSON.stringify(headers)
})
app.use(morgan('dev'))


// routers
app.use('/users', usersRouter);
app.use('/chores', choresRouter);
app.use('/meals', mealsRouter);
app.use('/attachments', attachmentsRouter);
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument))
app.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use((error: HttpException, request: Request, response: Response, next: NextFunction) => {
    // set locals, only providing error in development
    response.locals.message = error.message;
    response.locals.error = request.app.get('env') === 'development' ? error : {};

    // render the error page
    response.status(error.status || 500);
    response.render('error');
});

app.listen(80, () => {
    console.log(`Example app listening at http://localhost}`)
})

module.exports = app;