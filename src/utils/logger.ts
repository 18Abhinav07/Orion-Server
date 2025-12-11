import winston, { format } from 'winston';
import path from 'path';
import callsite from 'callsite';

const { combine, timestamp, json, printf, colorize, label, splat } = format;

const logDir = process.env.LOG_FILE_PATH || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format to get the call site using the 'callsite' library
const callSiteFormat = format((info) => {
  const stack = callsite();
  // Find the relevant call site in the stack
  const caller = stack.find((site) => {
    const fileName = site.getFileName();
    return fileName && !fileName.includes('node_modules') && !fileName.endsWith('logger.ts');
  });

  if (caller) {
    const fileName = path.basename(caller.getFileName() || 'unknown');
    const lineNumber = caller.getLineNumber();
    info.label = `${fileName}:${lineNumber}`;
  }
  return info;
});

// Custom format for console logging with colors
const consoleFormat = printf(({ level, message, timestamp, label: infoLabel }) => {
  const labelStr = infoLabel ? ` [${infoLabel}]` : '';
  return `${timestamp}${labelStr} ${level}: ${message}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      splat(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      callSiteFormat(),
      consoleFormat
    ),
  }),
  new winston.transports.File({
    filename: `${logDir}/combined.log`,
    format: combine(splat(), timestamp(), callSiteFormat(), json()),
  }),
  new winston.transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
    format: combine(splat(), timestamp(), callSiteFormat(), json()),
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports,
  exitOnError: false,
});

export default logger;
