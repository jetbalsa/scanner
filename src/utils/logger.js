import winston from 'winston';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('log-level', {
    alias: 'l',
    type: 'string',
    description: 'Set logging level',
    choices: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  })
  .help()
  .argv;

// Create custom format
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: argv.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  ]
});

// Export both the logger and the current log level
export const getLogLevel = () => argv.logLevel;
export default logger;
