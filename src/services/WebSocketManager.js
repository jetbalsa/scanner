import { Server } from 'socket.io';
import logger from '../utils/logger.js';

class WebSocketManager {
    constructor(io) {
        this.io = io;
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            logger.debug('Client connected');
            socket.on('disconnect', () => logger.debug('Client disconnected'));
        });
    }

    broadcastDnsEvent(domain, source) {
        const event = {
            type: 'dns_query',
            timestamp: new Date().toISOString(),
            domain,
            source,
            isBlacklisted: true
        };
        this.broadcast(event);
    }

    broadcastTcpEvent(source, destination, domain, bytes, protocol = 'tcp') {
        const event = {
            type: 'traffic',
            timestamp: new Date().toISOString(),
            source,
            destination,
            domain,
            bytes,
            protocol
        };
        this.broadcast(event);
    }

    broadcast(data) {
        this.io.emit('event', data);
    }

    async close() {
        logger.debug('Closing Socket.IO server...');
        return new Promise((resolve) => {
            this.io.close(() => {
                logger.debug('Socket.IO server closed');
                resolve();
            });
        });
    }
}

export default WebSocketManager;
