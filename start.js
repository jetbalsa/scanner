import logger from './src/utils/logger.js';
import './src/server.js';

// Check for root privileges
if (process.getuid && process.getuid() !== 0) {
    logger.error('This application requires root privileges to capture network traffic');
    process.exit(1);
}
