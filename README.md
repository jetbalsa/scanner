# Privacy Scanner

A real-time network traffic privacy scanner that detects and visualizes data leakage to third-party domains. This tool monitors network traffic, identifies connections to blacklisted domains, and provides an interactive physics-based visualization of data flows.

## Features

- 🔍 Real-time DNS query monitoring and TCP/UDP session tracking
- 📊 Interactive physics-based visualization of data flows
- 🚫 Extensive domain blacklist support with subdomain matching
- 🔄 Multi-threaded DNS resolution for improved performance
- 📡 WebSocket-based real-time updates
- 📝 Detailed logging system
- 🎯 Per-IP traffic visualization with dynamic particle system
- 🔊 Audio feedback for detected connections

## Prerequisites

- Node.js (ES modules support required)
- Root privileges (required for packet capture)
- Linux system with hostapd configured on wlan0

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd privacy-scanner
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the scanner (requires root privileges):
```bash
sudo node start.js
```

Optional command line arguments:
- `--log-level` or `-l`: Set logging level (error, warn, info, debug)
- Example: `sudo node start.js --log-level debug`

2. Access the web interface:
```
http://localhost:3000
```

## Architecture

### Core Components

- **PacketCapture**: Monitors network interface for DNS queries and TCP/UDP sessions
- **BlacklistManager**: Loads and checks domains against multiple blacklists
- **WebSocketManager**: Handles real-time event broadcasting
- **DnsWorker**: Performs asynchronous DNS resolution in separate thread
- **Visualization**: Physics-based particle system showing data flows

### Data Flow

1. PacketCapture monitors wlan0 interface
2. DNS queries are checked against BlacklistManager
3. Matched domains trigger DNS Worker resolution
4. TCP/UDP sessions are tracked for matched domains
5. Events are broadcast via WebSocket
6. Web interface updates in real-time with physics-based visualization

## Configuration

Configuration options in `src/config.js`:
```javascript
{
    interface: 'wlan0',          // Network interface to monitor
    blacklistUrls: [...],        // Array of blacklist URLs
    port: 3000                   // Web server port
}
```

### Blacklist Support

- Supports multiple blacklist URLs
- Automatic subdomain matching
- Comments in blacklist files are ignored
- Example blacklist URL: https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.amazon.txt

## Visualization Features

- Physics-based particle system
- Color-coded domains
- Dynamic particle merging
- Size based on data volume
- Per-IP traffic sections
- Real-time statistics
- Audio feedback for connections

## Event Types

### DNS Events
```javascript
{
    type: 'dns_query',
    timestamp: ISO8601,
    domain: string,
    source: string,        // 192.168.x.x format
    isBlacklisted: boolean
}
```

### Traffic Events
```javascript
{
    type: 'traffic',
    timestamp: ISO8601,
    source: string,        // 192.168.x.x format
    destination: string,
    domain: string,
    bytes: number,
    protocol: 'tcp' | 'udp'
}
```

## Logging

- Multiple log levels (error, warn, info, debug)
- Color-coded console output
- Structured format with timestamps
- Example:
```
[2025-02-01 17:39:24] INFO: DNS Query: domain.com from 192.168.1.100 - BLOCKED
[2025-02-01 17:39:24] DEBUG: Adding session tracking for domain.com at 1.2.3.4:*
```

## Notes

- Requires root privileges for packet capture
- Uses ES modules throughout the application
- WebSocket connection shares HTTP server port
- DNS resolution runs in separate thread for performance
- Automatic cleanup of old visualization particles
- Real-time statistics updates
