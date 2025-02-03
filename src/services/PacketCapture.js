import pcap from 'pcap';
import dns from 'dns-packet';
import logger from '../utils/logger.js';

class PacketCapture {
    constructor(networkInterface, blacklistManager, dnsWorker, wsManager) {
        this.interface = networkInterface;
        this.blacklistManager = blacklistManager;
        this.dnsWorker = dnsWorker;
        this.wsManager = wsManager;
        this.trackedIPs = new Map(); // Store IPs with their associated domains
        this.pcapSession = null;
    }

    start() {
        logger.debug('Starting packet capture');
        try {
            const filter = 'udp port 53 or tcp or udp';
            logger.debug(`Creating pcap session on interface ${this.interface} with filter: ${filter}`);
            this.pcapSession = pcap.createSession(this.interface, filter);
            
            logger.debug('Pcap session created successfully');
            logger.debug(`Selected device: ${this.pcapSession.device_name}`);
            logger.debug(`Filter applied: ${this.pcapSession.filter}`);
            logger.debug(`Link type: ${this.pcapSession.link_type}`);

            this.pcapSession.on('packet', this.handlePacket.bind(this));
        } catch (error) {
            logger.error('Failed to start packet capture:', error);
            throw error;
        }

        // Handle DNS resolution results from worker
        this.dnsWorker.on('message', ({ domain, addresses }) => {
            logger.debug('=== Received DNS Worker Response ===');
            logger.debug(`Domain: ${domain}`);
            logger.debug(`Resolved addresses: ${addresses ? addresses.join(', ') : 'none'}`);
            
            if (addresses && addresses.length > 0) {
                logger.debug(`DNS resolved ${domain} to ${addresses.length} addresses:`, addresses);
                
                // Log current tracking state
                logger.debug('Current tracked IPs before update:', Array.from(this.trackedIPs.keys()).join(', ') || 'none');
                
                // Add all returned IPv4 addresses for this domain
                addresses.forEach(addr => {
                    logger.debug(`Adding IP tracking for ${domain} at ${addr}`);
                    this.trackedIPs.set(addr, { domain });
                });
                
                // Log updated tracking state
                logger.debug('Updated tracked IPs:', Array.from(this.trackedIPs.keys()).join(', '));
                logger.debug(`Total IPs now being tracked: ${this.trackedIPs.size}`);
            } else {
                logger.debug(`No addresses returned for ${domain}, skipping IP tracking`);
            }
            logger.debug('=== DNS Worker Response Processing Complete ===');
        });
    }

    handlePacket(raw_packet) {
        const packet = pcap.decode.packet(raw_packet);
        try {        
        // First check if it's an ethernet packet
        if (packet.payload && packet.payload.constructor.name === 'EthernetPacket') {
            const eth = packet.payload;
            
            // Then check for IPv4 in the ethernet payload
            if (eth.payload && eth.payload.constructor.name === 'IPv4') {
                const ipv4 = eth.payload;
                
                // Handle DNS packets (UDP port 53)
                if (ipv4.payload && ipv4.payload.constructor.name === 'UDP') {
                    if (ipv4.payload.dport === 53) {
                        logger.debug('DNS query packet detected');
                        this.handleDnsPacket(ipv4);
                    }
                }
                // Handle TCP/UDP packets
                else if (ipv4.payload) {
                    if (ipv4.payload.constructor.name === 'TCP') {
                        this.handleDataPacket(ipv4, 'tcp');
                    } else if (ipv4.payload.constructor.name === 'UDP' && ipv4.payload.dport !== 53) {
                        // Handle UDP packets that aren't DNS queries
                        this.handleDataPacket(ipv4, 'udp');
                    }
                }
            }
        }
       } catch {
		return
      }
    }

    handleDnsPacket(ipv4) {
        try {
            logger.debug('=== Processing DNS Packet ===');
            logger.debug('Attempting to decode DNS packet');
            const dnsData = dns.decode(ipv4.payload.data);
            logger.debug('DNS packet structure:', JSON.stringify(dnsData, null, 2));
            
            if (dnsData.questions && dnsData.questions.length > 0) {
                const domain = dnsData.questions[0].name;
                const sourceIp = ipv4.saddr.toString();
                logger.debug(`Checking domain: ${domain}`);
                logger.debug(`Source IP: ${sourceIp}`);
                
                const isBlocked = this.blacklistManager.isBlacklisted(domain);
                logger.debug(`Blacklist check result: ${isBlocked ? 'BLOCKED' : 'ALLOWED'}`);
                
                // Log all DNS queries with their status
                logger.info(`DNS Query: ${domain} from ${sourceIp} - ${isBlocked ? 'BLOCKED' : 'ALLOWED'}`);
                
                if (isBlocked) {
                    logger.debug('Domain is blacklisted, broadcasting DNS event');
                    this.wsManager.broadcastDnsEvent(
                        domain,
                        sourceIp
                    );
                    logger.debug('DNS event broadcast completed');
                    
                    logger.debug('Starting DNS resolution in worker thread');
                    this.dnsWorker.postMessage({ domain, type: 'resolve' });
                    logger.debug('DNS resolution request sent to worker');
                }
            } else {
                logger.debug('No DNS questions found in packet');
            }
        } catch (error) {
            logger.error('Error processing DNS packet:', error);
            logger.debug('Error details:', error.message);
        }
    }

    handleDataPacket(ipv4, protocol) {
        const packet = ipv4.payload;
        const srcAddr = ipv4.saddr.toString();
        const dstAddr = ipv4.daddr.toString();
        
        logger.debug(`Checking ${protocol.toUpperCase()} packet: ${srcAddr} -> ${dstAddr}`);
        logger.debug(`Currently tracking IPs: ${Array.from(this.trackedIPs.keys()).join(', ') || 'none'}`);
        
        // Only check destination IP for tracking (outbound traffic)
        const dstTracked = this.trackedIPs.get(dstAddr);
        
        // Only process if destination IP matches a tracked domain (outbound to tracked domain)
        if (dstTracked) {
            logger.debug(`Destination IP ${dstAddr} matches tracked domain: ${dstTracked.domain}`);
            const dataLength = packet.data ? packet.data.length : 0;
            const ports = `${packet.sport} -> ${packet.dport}`;
            logger.debug(`Matched ${protocol.toUpperCase()} traffic for domain ${dstTracked.domain}:`);
            logger.debug(`  Direction: ${srcAddr}:${packet.sport} -> ${dstAddr}:${packet.dport}`);
            logger.debug(`  Payload size: ${dataLength} bytes`);
            
            this.wsManager.broadcastTcpEvent(
                srcAddr,
                dstAddr,
                dstTracked.domain,
                dataLength,
                protocol
            );
            logger.debug('Traffic event broadcast completed');
        } else {
            logger.debug('No tracked domains matched this packet');
        }
    }
    async stop() {
        logger.debug('Stopping packet capture');
        if (this.pcapSession) {
            // Close the pcap session
            this.pcapSession.close();
            this.pcapSession = null;
            logger.debug('Pcap session closed');
        }

        // Clear tracked IPs
        this.trackedIPs.clear();
        logger.debug('Tracked IPs cleared');
    }
}

export default PacketCapture;
