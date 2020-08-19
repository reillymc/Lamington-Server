var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var apiRouter = require('./routes/api');
var usersRouter = require('./routes/users');
var rfs = require('rotating-file-stream')
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./docs/documentation.json');
const options = require('./database/knexfile.js');
const knex = require('knex')(options);
const cors = require('cors');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(cors());

var accessLog = rfs('access.log', {
    interval: '1d',
    path: path.join(__dirname, 'log')
})
app.use(morgan('common', { stream: accessLog }));
morgan.token('req', (req, res) => JSON.stringify(req.headers))
morgan.token('res', (req, res) => {
    const headers = {}
    res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
    return JSON.stringify(headers)
})
app.use(morgan('dev'))
app.use((req, res, next) => {
    req.db = knex
    next()
})

// routers
app.use('/', apiRouter);
app.use('/', usersRouter);
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument))
app.use(swaggerUI.serve, swaggerUI.setup(swaggerDocument))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(80, () => {
    console.log(`Example app listening at http://localhost}`)
  })

module.exports = app;