const path = require('path');
const db = require(path.join(process.cwd(), 'config', 'db'));
const config = require(path.join(process.cwd(), 'config', 'config'));
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));
const report_status = config.report_status;

module.exports = {

    getAssignedReports: function (user_id, callback) {
        db.query('SELECT * FROM `report` WHERE NOT(`status` = ?) AND `report_id` IN (SELECT `report_id` FROM `assigned_users` WHERE `user_id` = ?) ORDER BY datetime', [report_status.SOLVED, user_id], (err, results) => {
            if (err) {
                logger.error(`Error getting assigned reports for ${user_id}: ${err}`);
                callback(err, null);
                return;
            }
            callback(null, results);
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
            callback(null, results);
        });
    },

    getFullReport: function (report_id, user_id = '', callback) {
        logger.debug(`Getting full report for ${report_id} user: ${user_id}`);

        db.query('SELECT * FROM `report` WHERE `report_id` = ?', [report_id], (err, results) => {
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

            db.query('SELECT `user_id`, `is_victim` FROM `reported_users` WHERE `report_id` = ?', [report_id], (err, results) => {
                if (err) {
                    logger.error(`Error getting reported users for ${report_id}: ${err}`);
                    callback(err, null);
                    return;
                }

                report.reported_users = results;

                db.query('SELECT `user_id`, `datetime` FROM `assigned_users` WHERE `report_id` = ?', [report_id], (err, results) => {
                    if (err) {
                        logger.error(`Error getting assigned users for ${report_id}: ${err}`);
                        callback(err, null);
                        return;
                    }

                    report.assigned_users = results;


                    if (user_id !== '') {
                        if (!(user_id in report.assigned_users)) {
                            logger.error(`User ${user_id} is not assigned to report ${report_id}`);
                            callback(null, null);
                            return;
                        }
                    }

                    callback(null, report);
                });

            });
        });
    }
};