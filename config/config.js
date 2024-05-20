const saltRounds = 10;

const report_status = {
    ERROR: 0,
    PENDING: 1,
    FIXING: 2,
    SOLVED: 3

}

const logDebug = false;


module.exports = {
    saltRounds,
    report_status,
    logDebug
};