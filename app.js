// app.js
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
const db = require('./config/db');
const auth = require(path.join(process.cwd(), 'config', 'auth'))(passport, db);
const routes = require(path.join(process.cwd(), 'routes', 'routes'))(passport);
const winston = require('winston');
const morgan = require('morgan');
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));

const app = express();


// Custom Morgan format
morgan.format('custom', function (tokens, req, res) {
    if (res.statusCode >= 400) {
        return [
            '<--',
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ')
    } else {
        return [
            '-->',
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ')
    }
});

// Set up Morgan
app.use(morgan('custom', {
    skip: function (req, res) { return res.statusCode < 400 },
    stream: { write: message => logger.log("file", message.trim()) }
}));

app.use(morgan('custom', {
    skip: function (req, res) { return res.statusCode >= 400 },
    stream: { write: message => logger.log("file", message.trim()) }
}));

// Set up Morgan
app.use(morgan('combined', { stream: { write: message => logger.log("file", message.trim()) } }));

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware for session handling
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Set up dynamic file engine
app.set('view engine', 'ejs');

//Set the folder for the file engine
app.set('views', path.join(__dirname, 'views'));

//Set errors from the file engine to go through the logger
app.use((err, req, res, next) => {
    logger.error(err);
    next(err);
});

// Routes
app.use('/', routes);

//Static pages
app.use('/js', express.static(path.join(__dirname, 'public/js')))
app.use('/public', express.static(path.join(__dirname, 'public')))

app.listen(3000, () => {

    logger.info('Server is running:');
    logger.info('http://localhost:3000');
    //// logger.info('http://192.168:3000');
    logger.info('Press Ctrl+C to quit');
});