const winston = require('winston');
const fs = require('fs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'warn' : 'http');

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp: ts, level, message, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts}${rid} [${level}]: ${message}${extra}`;
  })
);

const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: { ...winston.config.npm.levels, http: 5 },
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [new winston.transports.Console({ format: consoleFormat })],
});

if (NODE_ENV === 'production') {
  fs.mkdirSync('logs', { recursive: true });
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/access.log', level: 'http' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

module.exports = logger;
