import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_FILE_PATH || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Helper to convert JS paths to TS paths (for compiled code)
function convertJsToTsPath(jsPath: string): string {
  const projectRoot = process.cwd();
  if (jsPath.endsWith('.ts')) return jsPath;
  
  let tsPath = jsPath;
  if (jsPath.endsWith('.js')) {
    tsPath = jsPath.replace(/\.js$/, '.ts');
  }
  
  // Replace dist/build with src
  if (tsPath.includes('/dist/') || tsPath.includes('/build/')) {
    tsPath = tsPath.replace(/\/dist\//, '/src/').replace(/\/build\//, '/src/');
  }
  
  return tsPath;
}

// Get the actual caller info from stack trace - must be called synchronously during logging
function getCallerInfo(): { file: string; line: number; function: string; logpath: string } {
  const originalStackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 100; // Increased to capture deeper stack
  const error = {} as Error;
  Error.captureStackTrace(error, getCallerInfo);
  const stackLines = error.stack?.split('\n').slice(1) || [];
  Error.stackTraceLimit = originalStackTraceLimit;

  for (const line of stackLines) {
    const match = line.match(/\(([^:]+):(\d+):\d+\)/) || line.match(/at\s+([^:]+):(\d+):\d+/);

    if (match) {
      const [, file, lineNumber] = match;

      // Skip winston internals, node internals, and logger file itself
      if (
        file.includes('node_modules') ||
        file.includes('internal/') ||
        file.includes('node:') ||
        file.includes('/logger/logger') ||
        file.includes('/utils/logger') ||
        file.endsWith('logger.ts') ||
        file.endsWith('logger.js')
      ) {
        continue;
      }

      const tsPath = convertJsToTsPath(file);
      const projectPath = tsPath.replace(process.cwd(), '');
      const relativePath = projectPath.startsWith('/') ? projectPath.substring(1) : projectPath;

      return {
        file: path.basename(tsPath),
        line: parseInt(lineNumber, 10),
        function: line.match(/at\s+([^(]+)\s+\(/)?.[1]?.trim() || 'anonymous',
        logpath: `${relativePath}:${lineNumber}`
      };
    }
  }

  return { file: 'unknown', line: 0, function: 'anonymous', logpath: 'unknown:0' };
}

// Custom format that captures caller info at log time
const addCallerInfo = winston.format((info) => {
  const caller = getCallerInfo();
  info.logpath = caller.logpath;
  info.file = caller.file;
  info.line = caller.line;
  info.function = caller.function;
  return info;
});

// Console format with file path
const consoleFormat = winston.format.printf((info) => {
  const timestamp = info.timestamp;
  const logpath = info.logpath ? `[${info.logpath}]` : '';
  return `${timestamp} ${logpath} ${info.level}: ${info.message}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      addCallerInfo(),
      consoleFormat
    ),
  }),
  new winston.transports.File({
    filename: `${logDir}/combined.log`,
    format: winston.format.combine(
      winston.format.timestamp(),
      addCallerInfo(),
      winston.format.json()
    ),
  }),
  new winston.transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      addCallerInfo(),
      winston.format.json()
    ),
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

export default logger;
