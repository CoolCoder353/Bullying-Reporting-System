module.exports = [function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
},
function checkTeacher(req, res, next) {
    if (req.isAuthenticated() && (!req.user.is_parent) && (!req.user.is_student)) {
        return next();
    }
    res.redirect('/');
}
];