const path = require('path');
const db = require(path.join(process.cwd(), 'config', 'db'));
const config = require(path.join(process.cwd(), 'config', 'config'));
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));
const report_status = config.report_status;


function IsIn(element, list) {
    for (let i = 0; i < list.length; i++) {
        if (element == list[i].user_id) {
            return true;
        }
    }
    return false;
}



module.exports = {

    getAssignedReports: function (user_id, callback) {
        db.query('SELECT report.*, reported_users.* FROM `report` join reported_users WHERE reported_users.report_id = report.report_id AND NOT(report.`status` = ?) AND report.`report_id` IN (SELECT `report_id` FROM `assigned_users` WHERE `user_id` = ?) ORDER BY datetime;', [report_status.SOLVED, user_id], (err, results) => {
            if (err) {
                logger.error(`Error getting assigned reports for ${user_id}: ${err}`);
                callback(err, null);
                return;
            }

            var reports = [];
            results.forEach((report) => {
                //Update the status from a number to text
                report.code = report.status;
                report.status = Object.keys(report_status).find(key => report_status[key] === report.status);
                logger.info(`New report found: ${report.report_id}, status: ${report.status}, code: ${report.code}`);
                reports.push(report);
            });
            callback(null, reports);
        });
    },

    getReportsForStaff: function (callback) {
        logger.debug('Querying for all reports.');
        db.query('SELECT * FROM `report` WHERE NOT(`status` = ?) ORDER BY datetime', [report_status.SOLVED], (err, results) => {
            if (err) {
                logger.error(`Error getting reports for staff: ${err}`);
                callback(err, null);
                return;
            }
            logger.debug(`Found ${results.length} reports.`);
            var reports = [];
            results.forEach((report) => {
                //Update the status from a number to text
                report.code = report.status;
                report.status = Object.keys(report_status).find(key => report_status[key] === report.status);
                logger.info(`New report found: ${report.report_id}, status: ${report.status}, code: ${report.code}`);
                reports.push(report);
            });
            callback(null, reports);
        });
    },

    getFullReport: function (report_id, user_id = '', include_messages = true, callback) {
        logger.debug(`Getting full report for ${report_id} user: ${user_id}`);

        db.query('SELECT report.*, reported_users.* FROM `report` join reported_users WHERE reported_users.report_id = report.report_id AND report.report_id = ? ', [report_id], (err, results) => {
            if (err) {
                logger.error(`Error getting report ${report_id}: ${err}`);
                callback(err, null);
                return;
            }

            if (results.length === 0) {
                logger.error(`No report found for ${report_id}`);
                callback(null, null);
                return;
            }
            if (results.length > 1) {
                logger.error(`Multiple reports found for ${report_id}`);
                callback(null, null);
                return;
            }

            const report = results[0];

            //Update the status from a number to text
            report.code = report.status;
            report.status = Object.keys(report_status).find(key => report_status[key] === report.status);

            db.query('SELECT assigned_users.`user_id`, assigned_users.`datetime`, users.* FROM `assigned_users` join users WHERE `report_id` = ? AND assigned_users.user_id = users.user_ID ORDER BY datetime', [report_id], (err, results) => {
                if (err) {
                    logger.error(`Error getting assigned users for ${report_id}: ${err}`);
                    callback(err, null);
                    return;
                }

                report.assigned_users = results;


                if (user_id !== '') {
                    if (!IsIn(user_id, results)) {
                        logger.error(`User ${user_id} is not assigned to report ${report_id}`);
                        callback(null, null);
                        return;
                    }
                }

                if (include_messages) {
                    this.getMessages(report_id, user_id, (err, results) => {
                        if (err) {
                            logger.error(`Error getting messages for ${report_id}: ${err}`);
                            callback(err, null);
                            return;
                        }
                        if (results.length === 0) {
                            logger.warn(`No messages found for ${report_id}, excluding from report`);
                        }
                        else {
                            report.messages = results;
                        }

                    });
                }
                //If something went wrong, this will no longer be a function
                //NOTE: The return statments are doing nothing, need to refactor this code.
                if (callback != undefined) {
                    logger.debug(`Sent report ${report_id} to callback`);
                    callback(null, report);
                }
                else {
                    logger.warn(`Callback undefined after getting report ${report_id}`);
                }

            });


        });
    },

    getMessages: function (report_id, user_id = '', callback) {
        logger.debug(`Getting messages for report ${report_id} user: ${user_id}`);
        db.query('SELECT mg.*, us.username, us.firstname, us.lastname FROM `message` as mg JOIN `users` as us WHERE (mg.`report_id` = ? AND us.`user_ID` = mg.`user_id`) ORDER BY datetime;', [report_id], (err, results) => {
            if (err) {
                logger.error(`Error getting messages for ${report_id}: ${err}`);
                callback(err, null);
                return;
            }

            if (results.length === 0) {
                logger.debug(`No messages found for ${report_id}`);
            }

            if (user_id !== '') {
                db.query('SELECT `user_id` FROM `assigned_users` WHERE `report_id` = ?', [report_id], (err, results) => {
                    if (err) {
                        logger.error(`Error getting assigned users for ${report_id}: ${err}`);
                        callback(err, null);
                        return;
                    }

                    if (!IsIn(user_id, results)) {
                        logger.warn(`User ${user_id} is not assigned to report ${report_id}`);
                        callback(null, null);
                        return;
                    }
                });
            }
            logger.debug("Messages found: " + results.length);
            callback(null, results);
        });
    },
    sendMessage: function (report_id, user_id, message, callback) {
        logger.warn(`Sending message for report ${report_id} user: ${user_id}`);
        db.query('INSERT INTO `message` (`report_id`, `user_id`, `message`) VALUES (?, ?, ?)', [report_id, user_id, message], (err, results) => {
            if (err) {
                logger.error(`Error sending message for ${report_id}: ${err}`);
                callback(err, null);
                return;
            }
            callback(null, results);
        });
    },
    updateReportStatus: function (report_id, status, user_id, callback) {
        logger.debug(`Updating report ${report_id} status to ${status} by user ${user_id}`);

        if (user_id != '') {
            db.query('SELECT * FROM `assigned_users` WHERE `report_id` = ? AND `user_id` = ?', [report_id, user_id], (err, results) => {
                if (err) {
                    logger.error(`Error getting assigned users for ${report_id}: ${err}`);
                    callback(err, null);
                    return;
                }
                if (results.length === 0) {
                    logger.warn(`User ${user_id} is not assigned to report ${report_id}`);
                    callback(null, null);
                    return;
                }
                //If the user is in the assigned users, update the status
                if (IsIn(user_id, results)) {
                    db.query('UPDATE `report` SET `status` = ? WHERE `report_id` = ?', [status, report_id], (err, results) => {
                        if (err) {
                            logger.error(`Error updating report ${report_id}: ${err}`);
                            callback(err, null);
                            return;
                        }
                        callback(null, results);
                    });
                }

            });

        }
        else {
            db.query('UPDATE `report` SET `status` = ? WHERE `report_id` = ?', [status, report_id], (err, results) => {
                if (err) {
                    logger.error(`Error updating report ${report_id}: ${err}`);
                    callback(err, null);
                    return;
                }
                callback(null, results);
            });
        }
    },
    removeReport: function (report_id, user_id, callback) {
        logger.warn(`Removing report ${report_id} by user ${user_id}`);
        db.query('DELETE FROM `report` WHERE `report_id` = ?', [report_id], (err, results) => {
            if (err) {
                logger.error(`Error removing report ${report_id}: ${err}`);
                callback(err, null);
                return;
            }
            else {
                db.query('DELETE FROM `message` WHERE `report_id` = ?', [report_id], (err, results) => {
                    if (err) {
                        logger.error(`Error removing messages for report ${report_id}: ${err}`);
                        callback(err, null);
                        return;
                    } else {
                        db.query('DELETE FROM `assigned_users` WHERE `report_id` = ?', [report_id], (err, results) => {
                            if (err) {
                                logger.error(`Error removing assigned users for report ${report_id}: ${err}`);
                                callback(err, null);
                                return;
                            } else {
                                db.query('DELETE FROM `reported_users` WHERE `report_id` = ?', [report_id], (err, results) => {
                                    if (err) {
                                        logger.error(`Error removing reported users for report ${report_id}: ${err}`);
                                        callback(err, null);
                                        return;
                                    }
                                    callback(null, results);
                                });
                            }

                        });
                    }
                });
            }

        });
    }
};