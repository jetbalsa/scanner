import { parentPort } from 'worker_threads';
import dns from 'dns/promises';
import logger from '../utils/logger.js';

// Configure DNS resolver to use Cloudflare's 1.1.1.1
dns.setServers(['1.1.1.1']);

parentPort.on('message', async ({ domain, type }) => {
    if (type === 'resolve') {
        try {
            logger.debug(`[DNS Worker] Resolving IPv4 addresses for ${domain}`);
            const result = await dns.resolve4(domain);
            logger.debug(`[DNS Worker] Resolved ${domain} to IPv4 addresses:`, result);
            parentPort.postMessage({ domain, addresses: result });
        } catch (error) {
            logger.error(`[DNS Worker] Error resolving ${domain}:`, error.message);
            parentPort.postMessage({ domain, error: error.message });
        }
    }
});
