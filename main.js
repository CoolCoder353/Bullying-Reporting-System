const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

const saltRounds = 10;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bully'
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database');
});

passport.use(new LocalStrategy(
    function (username, password, done) {
        db.query('SELECT password FROM users WHERE username = ?', [username], (err, results) => {
            if (err) { return done(err) }
            if (!results.length) { return done(null, false); }
            const hash = results[0].password.toString();
            bcrypt.compare(password, hash, function (err, response) {
                if (response === true) {
                    return done(null, { user_id: results[0].id });
                } else {
                    return done(null, false);
                }
            });
        });
    }
));

passport.serializeUser(function (user_id, done) {
    done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
    done(null, user_id);
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
});


app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server error');
        } else {
            db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Server error');
                } else {
                    res.redirect('/login');
                }
            });
        }
    });
});

app.get('/authenticated', ensureAuthenticated, (req, res) => {
    res.send('Welcome, authenticated user!');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});