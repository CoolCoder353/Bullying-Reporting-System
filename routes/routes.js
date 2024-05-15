const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require(path.join(process.cwd(), 'config', 'db'));
const crypto = require('crypto');

const check = require(path.join(process.cwd(), 'middleware', 'check'));
const checkAuthenticated = check[0];
const checkTeacher = check[1];
const report_status = require(path.join(process.cwd(), 'config', 'config')).report_status;

module.exports = function (passport) {
    const saltRounds = require(path.join(process.cwd(), 'config', 'config')).saltRounds;
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

        if (username === '' || password === '') {
            res.status(400).send('Username and password are required');
            return;
        }
        console.log('Registering user: ', username, password, firstname, lastname, is_parent, is_student, "with saltRounds: ", saltRounds);
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
        res.send("Welcome, authenticated user!<br><a href='/logout'>Logout</a><br><a href='/help'>Help</a><br><a href='/submit_incident'>Submit Incident</a><br><a href='/'>Home</a><br><a href='/view_reports'>View Reports</a>");

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
    router.post('/submit_incident', checkAuthenticated, (req, res) => {
        const student_reporting = req.user?.user_id;//get student id from session
        const student_reported = req.body.student_reported;
        const incident_title = req.body.incident_title;
        const incident_description = req.body.incident_description;
        const incident_date = req.body.incident_date;
        const incident_location = req.body.incident_location;
        const is_annonomous = req.body.is_annonomous || 0;
        const is_victim = req.body.is_victim || 0;
        const report_Id = crypto.randomBytes(16).toString("hex");

        console.log('Submitting incident: ', student_reporting, student_reported, incident_title, incident_description, incident_date, incident_location, is_annonomous, is_victim, report_Id);
        //Make sure the data is not over the limit of characters
        if (incident_title.length > 100 || incident_description.length > 250 || incident_location.length > 100, incident_title.length > 5) {
            res.status(400).send('Data is too long.');
            return;
        }

        if (student_reported === '' || incident_title === '' || incident_description === '' || incident_date === '' || incident_location === '') {
            res.status(400).send('All fields are required.');
            return;
        }


        //append the data to the reports table in the database
        db.query('INSERT INTO `report`(`report_id`,`title`, `description`, `location`, `status`) VALUES (?,?,?,?,?)',
            [report_Id, incident_title, incident_description, incident_location, '1'],
            (err, results) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Server error sending report.');
                    return;
                }

            });


        //Add the reported users to the reported_users table in the database
        db.query('INSERT INTO `reported_users`(`user_id`, `report_id`, `is_victim`) VALUES (?,?,?)',
            [student_reported, report_Id, is_victim],
            (err, results) => {
                if (err) {
                    console.error(err);
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
                        console.error(err);
                        res.status(500).send('Server error assigning reporting users');
                        return;
                    }
                });
        }


        //send the user to the help page

        res.redirect('/help');






    });
    router.get("/submit_incident", checkAuthenticated, (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'submit_incident.html'));
    });
    router.get("/help", (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'help.html'));
    });

    router.get("/view_reports", checkAuthenticated, checkTeacher, (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'view_reports.html'));
    });
    return router;
}