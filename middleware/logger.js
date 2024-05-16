const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            const color = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'white';
            return `\x1b[1m\x1b[${color}m${timestamp} [${level}]: ${message}\x1b[0m`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} [${level}]: ${message}`;
                })
            ),
            handleExceptions: true,
            handleRejections: true,
            prettyPrint: true,
            colorize: true,
            timestamp: true,
            stderrLevels: ['error', 'warn']
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

module.exports = logger;