import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import logger from './utils/logger.js';
import app from './app.js';
import config from './config.js';
import PacketCapture from './services/PacketCapture.js';
import BlacklistManager from './services/BlacklistManager.js';
import WebSocketManager from './services/WebSocketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
    try {
        // Initialize services
        const blacklistManager = new BlacklistManager(config.blacklistUrls);
        await blacklistManager.loadBlacklists();

        // Create DNS worker
        const dnsWorker = new Worker(join(__dirname, 'workers', 'DnsWorker.js'));

        // Create HTTP server with Express
        const server = createServer(app);
        
        // Initialize Socket.IO with HTTP server
        const io = new SocketIOServer(server);
        
        // Start listening
        server.listen(config.port, '0.0.0.0', () => {
            logger.info(`Server running on 0.0.0.0:${config.port}`);
        });
        
        // Initialize WebSocket manager with Socket.IO instance
        const wsManager = new WebSocketManager(io);

        // Start packet capture
        const packetCapture = new PacketCapture(
            config.interface,
            blacklistManager,
            dnsWorker,
            wsManager
        );
        packetCapture.start();

        // Graceful shutdown handler
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}. Performing graceful shutdown...`);
            
            try {
                // Stop packet capture first to prevent new connections
                logger.debug('Stopping packet capture...');
                await packetCapture.stop();
                logger.debug('Packet capture stopped');

                // Terminate DNS worker
                logger.debug('Terminating DNS worker...');
                await dnsWorker.terminate();
                logger.debug('DNS worker terminated');

                // Close WebSocket connections
                logger.debug('Closing WebSocket connections...');
                await wsManager.close();
                logger.debug('WebSocket connections closed');

                // Finally close the HTTP server
                logger.debug('Closing HTTP server...');
                await new Promise((resolve) => {
                    server.close(() => {
                        logger.debug('HTTP server closed');
                        resolve();
                    });
                });

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        // Register shutdown handlers
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(err => logger.error('Unhandled error:', err));
