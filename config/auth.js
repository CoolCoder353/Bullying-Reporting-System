// auth.js

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

module.exports = function (passport, db) {
    const saltRounds = 10;

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
}