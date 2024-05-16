const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    const color = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'white';
                    return `\x1b[1m\x1b[${color}m${timestamp} [${level}]: ${message}\x1b[0m`;
                })
            ),
            handleExceptions: true,
            handleRejections: true,
            prettyPrint: true,
            colorize: true,
            timestamp: true,
            stderrLevels: ['error', 'warn']
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: winston.format.json() }),
        new winston.transports.File({ filename: 'logs/combined.log', format: winston.format.json() })
    ]
});

module.exports = logger;