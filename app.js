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

const app = express();

// Set up Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// Set up Morgan
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware for session handling
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', routes);

app.listen(3000, () => {
    logger.info('Server is running on port 3000');
});