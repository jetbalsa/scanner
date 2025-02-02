import axios from 'axios';
import logger from '../utils/logger.js';

class BlacklistManager {
    constructor(blacklistUrls) {
        this.blacklistUrls = blacklistUrls;
        this.blacklistedDomains = new Set();
    }

    async loadBlacklists() {
        try {
            for (const url of this.blacklistUrls) {
                const response = await axios.get(url);
                const lines = response.data.split('\n');
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && !trimmedLine.startsWith('#')) {
                        this.blacklistedDomains.add(trimmedLine);
                    }
                }
            }
            logger.info(`Loaded ${this.blacklistedDomains.size} blacklisted domains`);
        } catch (error) {
            logger.error('Error loading blacklists:', error);
            throw error;
        }
    }

    isBlacklisted(domain) {
        // Check exact match
        if (this.blacklistedDomains.has(domain)) {
            return true;
        }

        // Check if domain is a subdomain of any blacklisted domain
        const parts = domain.split('.');
        for (let i = 1; i < parts.length - 1; i++) {
            const parentDomain = parts.slice(i).join('.');
            if (this.blacklistedDomains.has(parentDomain)) {
                return true;
            }
        }

        return false;
    }

    getDomains() {
        return Array.from(this.blacklistedDomains);
    }
}

export default BlacklistManager;
