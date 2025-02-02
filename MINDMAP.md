# Privacy Scanner Project Mindmap

## 🌐 Entry Points
- `start.js`
  - Root privilege check
  - Imports and starts server.js
- `src/server.js`
  - Main application orchestration
  - Service initialization
  - Graceful shutdown handling

## ⚙️ Configuration
- `src/config.js`
  - Network interface settings
  - Blacklist URLs
  - Server port configuration

## 🖥️ Web Interface
- `src/public/index.html`
  - Physics-based visualization using Matter.js
  - Real-time packet visualization as falling orbs
  - IP-based collection buckets
  - Dynamic orb merging and growth
  - Color-coded domains
  - Fluid-like physics behavior
  - Statistics dashboard
  - WebSocket client connection
  - Multi-user support via IP tracking
  - WiFi connection QR code

### Visualization System (`src/public/visualization.js`)
- Matter.js physics engine integration
- Dynamic bucket creation per IP
- Packet representation as physics-enabled orbs
- Orb merging mechanics:
  - Same domain combination
  - Size based on data volume
  - Fluid-like jiggling effects
- Real-time statistics:
  - Total packets processed
  - Active connections
- Automatic cleanup of old particles

## 🔧 Core Services
### Packet Capture (`src/services/PacketCapture.js`)
- DNS packet handling
- TCP session tracking
- Packet decoding and analysis
- Integration with:
  - BlacklistManager for domain checking
  - WebSocketManager for event broadcasting
  - DnsWorker for resolution

## 📝 Logging System (`src/utils/logger.js`)
- Centralized logging with Winston
- Multiple log levels (error, warn, info, debug)
- Command line log level control
  - Use --log-level or -l flag
  - Example: `node start.js --log-level debug`
- Structured logging format:
  - Timestamp
  - Log level
  - Detailed message
- No disk logging, console output only
- Color-coded output for better readability

### Blacklist Management (`src/services/BlacklistManager.js`)
- Blacklist loading from URLs
- Domain checking
- Subdomain matching
- Methods:
  - loadBlacklists()
  - isBlacklisted()
  - getDomains()

### WebSocket Management (`src/services/WebSocketManager.js`)
- Client connection handling
- Real-time event broadcasting
- Methods:
  - broadcastDnsEvent()
  - broadcastTcpEvent()

## 👷 Workers
### DNS Worker (`src/workers/DnsWorker.js`)
- Asynchronous DNS resolution
- Multi-threaded processing
- Communication with main thread

## 🌐 Web Server
### Express App (`src/app.js`)
- Static file serving
- Health check endpoint
- Error handling middleware

## 🔄 Data Flow
1. Packet Capture monitors network interface
2. DNS queries checked against BlacklistManager
3. Matched domains trigger DNS Worker resolution
4. TCP sessions tracked for matched domains
5. Events broadcast via WebSocket
6. Web interface updates in real-time

## 📊 Event Types
### DNS Events
```javascript
{
    type: 'dns_query',
    timestamp: ISO8601,
    domain: string,
    source: string, // 192.168.x.x format for user tracking
    isBlacklisted: boolean
}
```

### Traffic Events
```javascript
{
    type: 'traffic',
    timestamp: ISO8601,
    source: string, // 192.168.x.x format for user tracking
    destination: string,
    domain: string,
    bytes: number,
    protocol: 'tcp' | 'udp'
}
```

### User Statistics
```javascript
{
    queries: number,
    traffic: number, // bytes
    domains: Set<string>
}
```

## 🔍 Key Features Location
- Domain blacklisting: `BlacklistManager.isBlacklisted()`
- Packet processing: `PacketCapture.handlePacket()`
- Real-time updates: `WebSocketManager.broadcast()`
- DNS resolution: `DnsWorker.create()`
- Traffic visualization: `public/index.html`

## 🛠️ Configuration Options
Located in `src/config.js`:
```javascript
{
    interface: 'wlan0',
    blacklistUrls: [...],
    port: 3000
}
```

## 📝 Notes
- All services are initialized in `server.js`
- WebSocket connection on same port as HTTP server
- DNS Worker runs in separate thread for performance
- Blacklist supports wildcard subdomain matching
- Real-time updates use WebSocket for efficiency
- ES modules used throughout the application
- Logging examples:
  ```
  [2025-02-01 17:39:24] INFO: DNS Query: domain.com from 192.168.1.100 - BLOCKED
  [2025-02-01 17:39:24] DEBUG: Adding session tracking for domain.com at 1.2.3.4:*
  [2025-02-01 17:39:24] ERROR: Failed to decode DNS packet
  ```

Starting Prompt

setup a nodejs project, the goal is to make a webui showing hows people's data is being leaked to third parties. I've got hostapd running and started on wlan0, sniff wlan0 and find DNS quries, then follow the TCP/UDP sessions as they transmit data to the blacklisted domains, the blacklists are at urls like https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.amazon.txt  and have comments and a list of domains, allow for lots of lists to be added, 

have the nodejs be multi-threaded for the dns and ip lookups and a webserver with websockets to display the details, add some logging showing details about the detection. also setup the venv

have it emit websocket data when a blacklisted domain or tcp packet is detected, make sure to do it per packet of the ip addresss that are returned by dns

have the dns hostname also match for any subdomains of that main domain listed.
