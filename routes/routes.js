const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require(path.join(process.cwd(), 'config', 'db'));
const crypto = require('crypto');
const { error } = require('console');
const e = require('express');
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));

const check = require(path.join(process.cwd(), 'middleware', 'check'));
const checkAuthenticated = check[0];
const checkTeacher = check[1];

const report_status = require(path.join(process.cwd(), 'config', 'config')).report_status;
const report_manager = require(path.join(process.cwd(), 'middleware', 'report_manager'));

module.exports = function (passport) {
    const saltRounds = require(path.join(process.cwd(), 'config', 'config')).saltRounds;
    const router = express.Router();

    router.post('/login', function (req, res, next) {
        passport.authenticate('local', function (err, user, info) {
            logger.info(`Authenticating user: ${req.body.username} with password: ${req.body.password}, user: ${user}, info: ${info}, err: ${err}`);
            if (err) {
                logger.error(`Error authenticating user: ${err}`);
                return next(err);
            }
            if (!user) {
                req.session.login_error = "Incorrect username or password.";
                logger.info(`User '${req.body.username}' failed to login: "Incorrect username or password."`);
                return res.redirect('/login');
            }
            req.logIn(user, function (err) {
                if (err) {
                    logger.error(`Error logging in user: ${err}`);
                    return next(err);
                }
                return res.redirect('/authenticated');
            });
        })(req, res, next);
    });

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

        if (username === '' || password === '') {
            res.status(400).send('Username and password are required');
            return;
        }
        winston.log('Registering user: ', username, password, firstname, lastname, is_parent, is_student, "with saltRounds: ", saltRounds);
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
                logger.error(`Error hashing password: ${err}`);
                res.status(500).send('Server error');
            } else {
                db.query('INSERT INTO users (username, firstname, lastname, password, is_parent, is_student) VALUES (?, ?, ?, ?, ?, ?)',
                    [username, firstname, lastname, hashedPassword, is_parent, is_student],
                    (err, results) => {
                        if (err) {
                            logger.error(`Error inserting report into report table: ${err}`);
                            res.status(500).send('Server error');
                        } else {
                            res.redirect('/login');
                        }
                    });

            }
        });
    });

    router.get('/authenticated', checkAuthenticated, (req, res) => {
        logger.info('User successfully authenticated');
        res.send("Welcome, authenticated user!<br><a href='/logout'>Logout</a><br><a href='/help'>Help</a><br><a href='/submit_incident'>Submit Incident</a><br><a href='/'>Home</a><br><a href='/view_reports'>View Reports</a><br><a href='/view_assigned_reports'>View Assigned Reports</a>");

    });

    router.get('/login', (req, res) => {
        res.render('login', { error: req.session.login_error, user: req.user });
    });

    router.get('/register', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'register.html'));
    });

    router.get('/', (req, res) => {
        res.render("index", { user: req.user });
    });
    router.post('/submit_incident', checkAuthenticated, (req, res) => {
        const student_reporting = req.user?.user_id;//get student id from session
        const student_reported_firstname = req.body.student_reported_firstname;
        const student_reported_lastname = req.body.student_reported_lastname;
        const incident_title = req.body.title;
        const incident_description = req.body.description;
        const incident_date = req.body.date;
        const incident_location = req.body.location;
        const is_annonomous = req.body.is_annonomous || 0;
        const report_Id = crypto.randomBytes(16).toString("hex");

        //Make sure the data is not over the limit of characters
        if (incident_title.length > 100 || incident_description.length > 250 || incident_location.length > 100 || student_reported_firstname.length > 120 || student_reported_lastname.length > 120) {
            res.status(400).send('Data is too long.');
            return;
        }

        if (student_reported_firstname === '' || student_reported_lastname === "" || incident_title === '' || incident_description === '' || incident_date === '' || incident_location === '') {
            res.status(400).send('All fields are required.');
            return;
        }


        //append the data to the reports table in the database
        db.query('INSERT INTO `report`(`report_id`,`title`, `description`, `location`, `status`) VALUES (?,?,?,?,?)',
            [report_Id, incident_title, incident_description, incident_location, report_status.PENDING],
            (err, results) => {
                if (err) {
                    logger.error(`Error inserting report into report table: ${err}`);
                    res.status(500).send('Server error sending report.');
                    return;
                }

            });


        //Add the reported users to the reported_users table in the database
        db.query('INSERT INTO `reported_users`(`report_id`, `firstname`, `lastname`) VALUES (?,?,?)',
            [report_Id, student_reported_firstname, student_reported_lastname],
            (err, results) => {
                if (err) {
                    logger.error(`Error inserting report into reported_users table: ${err}`);
                    res.status(500).send('Server error assigning reported users.');
                    return;
                }
            });

        if (is_annonomous !== "1") {
            //append the student reporting, and report id to the assigned_users table in the database
            db.query("INSERT INTO `assigned_users`(`user_id`, `report_id`) VALUES (?,?)",
                [student_reporting, report_Id],
                (err, results) => {
                    if (err) {
                        logger.error(`Error inserting report into assigned_users table: ${err}`);
                        res.status(500).send('Server error assigning reporting users');
                        return;
                    }
                });
        }
        //send the user to the help page

        res.redirect('/help');
    });
    router.get("/submit_incident", checkAuthenticated, (req, res) => {
        res.render("submit", { error: req.session.submit_error, user: req.user });
    });
    router.get("/help", (req, res) => {
        res.render("help", { user: req.user });
    });

    router.get("/view_all_reports", checkAuthenticated, checkTeacher, (req, res) => {
        logger.debug('Getting all reports');

    });

    router.get("/view_assigned_reports", checkAuthenticated, (req, res) => {
        const user_id = req.user?.user_id;
        logger.info('Getting assigned reports for user: ', user_id);

        var var_assigned_reports = [];
        var var_all_reports = [];
        report_manager.getAssignedReports(user_id, (err, reports) => {
            if (err) {
                logger.error(`Error getting assigned reports for user: ${err}`);
                res.status(500).send('Server error getting reports.');
                return;
            }
            logger.info(`Generating assigned reports (${reports.length})`);
            var_assigned_reports = reports;

            if (!(req.user.is_student) && !(req.user.is_parent)) {
                report_manager.getReportsForStaff((err, reports) => {
                    if (err) {
                        logger.error(`Error getting reports for staff: ${err}`);
                        res.status(500).send('Server error getting reports.');
                        return;
                    }
                    logger.info(`Generating all reports (${reports.length})`);
                    var_all_reports = reports;

                    logger.info(`Rendering report_master with ${var_assigned_reports.length} assigned reports`);
                    logger.info(`Rendering report_master with ${var_all_reports.length} all reports`);
                    res.render('report_master', { assigned_reports: var_assigned_reports, all_reports: var_all_reports, user: req.user });
                });
            }
            else {
                logger.info(`Rendering report_master with ${var_assigned_reports.length} assigned reports`);
                res.render('report_master', { assigned_reports: var_assigned_reports, all_reports: var_all_reports, user: req.user });
            }
        });
    });

    router.get("/view_full_report", checkAuthenticated, (req, res) => {

        const report_id = req.query.id;
        let user_id = req.user?.user_id;

        //If the user is a staff, they dont need to be assigned to see it.
        if (!(req.user?.is_student) && !(req.user?.is_parent)) {
            user_id = '';
        }

        logger.debug(`Getting full report for ${report_id} user: ${user_id}`);

        report_manager.getFullReport(report_id, user_id, true, (err, report) => {
            if (err) {
                logger.error(`Error getting full report for ${report_id}: ${err}`);
                res.status(500).send('Server error getting report.');
                return;
            }
            if (report === null) {
                logger.error(`No report found for ${report_id}`);
                res.status(404).send('Report not found.');
                return;
            }
            logger.info(`Generating full report for ${report_id}`);

            var status = {};
            if (report.code == report_status.PENDING) {
                status = { status: "Fixing", code: report_status.FIXING };
            }
            else if (report.code == report_status.FIXING) {
                status = { status: "Solved", code: report_status.SOLVED };
            } else {
                status = { status: "Pending", code: report_status.PENDING };
            }

            res.render('report_details', { report: report, status_code: status, user: req.user });
        });

    });


    router.post("/report_messages", checkAuthenticated, (req, res) => {
        const report_id = req.body.id;
        let user_id = req.user?.user_id;

        //If the user is a staff, they dont need to be assigned to see it.
        if (!(req.user?.is_student) && !(req.user?.is_parent)) {
            user_id = '';
        }

        logger.debug(`Getting messages for report: ${report_id}`);
        report_manager.getMessages(report_id, user_id, (err, messages) => {
            if (err) {
                logger.error(`Error getting messages for report: ${report_id}: ${err}`);
                res.status(500).send('Server error getting messages.');
                return;
            }
            if (messages === null) {
                logger.error(`No messages found for report: ${report_id}`);
                res.status(404).send('Messages not found.');
                return;
            }
            logger.debug(`Generating '${messages.length}' messages for report: ${report_id}`);
            res.status(200).send(messages);
        });
    });
    router.post("/send_message", checkAuthenticated, (req, res) => {
        const report_id = req.body.id;
        const user_id = req.user?.user_id;
        const message = req.body.message;

        if (message === '') {
            res.status(400).send('Message is required');
            return;
        }
        if (user_id === undefined || user_id === '') {
            res.status(400).send('User is not logged in');
            return;
        }
        if (report_id === undefined || report_id === '') {
            res.status(400).send('Report is not defined');
            return;
        }
        logger.warn(`Sending message for report: ${report_id} from user: ${user_id}`);
        report_manager.sendMessage(report_id, user_id, message, (err) => {
            if (err) {
                logger.error(`Error sending message for report: ${report_id}: ${err}`);
                res.status(500).send(`Server error sending message. ${err}`);
                return;
            }
            logger.info(`Message sent for report: ${report_id}`);
            res.sendStatus(200);
        });
    });

    router.get("/update_status", checkAuthenticated, (req, res) => {
        const status = req.query.status;
        const report_id = req.query.id;
        let user_id = req.user?.user_id;

        if (status === undefined || status === '') {
            res.status(400).send('Status is required');
            return;
        }
        if (report_id === undefined || report_id === '') {
            res.status(400).send('Report is required');
            return;
        }

        //If staff, they dont need to be assigned to edit it.
        if (!(req.user?.is_student) || !(req.user?.is_parent)) {
            user_id = '';
        }
        logger.info(`Updating status for report: ${report_id} to ${status}`);

        report_manager.updateReportStatus(report_id, status, user_id, (err) => {
            if (err) {
                logger.error(`Error updating status for report: ${report_id}: ${err}`);
                res.status(500).send('Server error updating status.');
                return;
            }
            logger.info(`Status updated for report: ${report_id}`);
            res.redirect('/view_full_report?id=' + report_id);
        });

    });

    //ONLY TEACHERS CAN DELETE REPORTS
    router.get("/delete_report", checkAuthenticated, checkTeacher, (req, res) => {
        const user_id = req.user?.user_id;
        const report_id = req.query.id;

        if (report_id === undefined || report_id === '') {
            res.status(400).send('Report is required');
            return;
        }

        logger.warn(`Deleting report: ${report_id}, user${user_id}`);

        report_manager.removeReport(report_id, user_id, (err) => {
            if (err) {
                logger.error(`Error deleting report: ${report_id}: ${err}`);
                res.status(500).send('Server error deleting report.');
                return;
            }
            else {
                logger.info(`Report deleted: ${report_id}`);
                res.redirect('/view_all_reports');
            }

        });
    });

    return router;
}