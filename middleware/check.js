const path = require('path');
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));

module.exports = [
    function checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            logger.debug(`${req.user.username} successfully authenticated`);
            return next();
        }
        res.redirect('/login');
    },
    function checkTeacher(req, res, next) {
        if (req.isAuthenticated() && (!req.user.is_parent) && (!req.user.is_student)) {
            logger.debug(`${req.user.username} successfully authenticated to be a teacher.`);
            return next();
        }
        res.redirect('/');
    },
    function checkParent(req, res, next) {
        if (req.isAuthenticated() && req.user.is_parent && (!req.user.is_student)) {
            logger.debug(`${req.user.username} successfully authenticated to be a parent.`)
            return next();
        }
        res.redirect('/');
    },
    function checkStudent(req, res, next) {
        if (req.isAuthenticated() && req.user.is_student && (!req.user.is_parent)) {
            logger.debug(`${req.user.username} successfully authenticated to be a student.`)
            return next();
        }
        res.redirect('/');
    }
];