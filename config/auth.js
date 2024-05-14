// auth.js
const path = require('path');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

module.exports =
    function (passport, db) {


        passport.use(new LocalStrategy(
            function (username, password, done) {
                db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
                    if (err) { return done(err) }
                    if (!results.length) { return done(null, false); }
                    const hash = results[0].password.toString();
                    bcrypt.compare(password, hash, function (err, response) {
                        if (response === true) {

                            return done(null, { user_id: results[0].user_ID, username: results[0].username, fristname: results[0].firstname, lastname: results[0].lastname, is_parent: results[0].is_parent, is_student: results[0].is_student });
                        } else {
                            return done(null, false);
                        }
                    });
                });
            }
        ));

        passport.serializeUser(function (user_object, done) {
            done(null, user_object);
        });

        passport.deserializeUser(function (user_object, done) {
            done(null, user_object);
        });
    }
