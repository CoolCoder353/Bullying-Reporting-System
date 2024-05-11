const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const checkAuthenticated = require(path.join(process.cwd(), 'middleware', 'checkAuthenticated'));

module.exports = function (passport) {
    const router = express.Router();

    router.post('/login', passport.authenticate('local', { failureRedirect: '/login', successRedirect: '/authenticated' }));

    router.get('/logout', (req, res) => {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    });

    router.post('/register', (req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        const firstname = req.body.firstname || "Test";
        const lastname = req.body.lastname || "Student";
        const is_parent = req.body.is_parent || 0;
        const is_student = req.body.is_student || 1;

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
                console.error(err);
                res.status(500).send('Server error');
            } else {
                db.query('INSERT INTO users (username, firstname, lastname, password, is_parent, is_student) VALUES (?, ?, ?, ?, ?, ?)',
                    [username, firstname, lastname, hashedPassword, is_parent, is_student],
                    (err, results) => {
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

    router.get('/authenticated', checkAuthenticated, (req, res) => {
        console.log('User successfully authenticated');
        res.send('Welcome, authenticated user!');
    });

    router.get('/login', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
    });

    router.get('/register', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'register.html'));
    });

    router.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    });

    return router;
}