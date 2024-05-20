const winston = require('winston');
const path = require('path');
const config = require(path.join(process.cwd(), 'config', 'config'));

const customLevels = {
    levels: {
        file: 99,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4
    },
    colors: { //'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey'.
        file: 'magenta',
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue'
    }
};

consoleLevels = ['error', 'warn', 'info'];

consoleLevel = 'info';
if (config.logDebug) {
    consoleLevels.push('debug');
    consoleLevel = 'debug';
}


winston.addColors(customLevels.colors);

const logger = winston.createLogger({
    levels: customLevels.levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format((info, opts) => {
                    if (info.level === 0) { //file level
                        return false;
                    }
                    return info;
                })(),
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} [${level}]: ${message}`.replace("hitem", "").replace("Z", "").replace("T", " ");
                })
            ),
            handleExceptions: true,
            handleRejections: true,
            prettyPrint: true,
            colorize: true,
            timestamp: true,
            stderrLevels: consoleLevels,
            level: consoleLevel
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: winston.format.json() }),
        new winston.transports.File({ filename: 'logs/combined.log', format: winston.format.json() })
    ]
});

module.exports = logger;