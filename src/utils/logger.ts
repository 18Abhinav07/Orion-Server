import winston from 'winston';

const { combine, timestamp, json, printf, colorize } = winston.format;

const logDir = process.env.LOG_FILE_PATH || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format for console logging with colors
const consoleFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const transports: winston.transport[] = [
  // Console transport with colorization
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: `${logDir}/combined.log`,
    format: combine(timestamp(), json()),
  }),
  // File transport for error logs
  new winston.transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
    format: combine(timestamp(), json()),
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

export default logger;
