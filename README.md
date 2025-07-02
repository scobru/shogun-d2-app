# Shogun-D2

A secure, decentralized networking layer built on top of Bugout with enhanced encryption and peer-to-peer communication features.

## Features

- 🔒 End-to-end encryption using SEA (Security, Encryption, and Authorization)
- 🌐 Peer-to-peer communication over WebRTC
- 🔑 Automatic key exchange and peer discovery
- 📡 Broadcast and direct messaging support
- 💪 Robust error handling and connection recovery
- 🔄 Event-driven architecture
- 🛡️ Secure seed management

## Installation

```bash
npm install shogun-d2
# or
yarn add shogun-d2
```

## Usage

### Basic Setup

```javascript
const Bugoff = require('shogun-d2');

// Initialize with options
const d2 = new Bugoff({
  seed: 'optional-seed-string' // Optional: Provide a seed for deterministic addressing
});

// Or initialize with an identifier
const d2WithId = new Bugoff('your-identifier');
```

### Encryption and Messaging

```javascript
// Enable encryption (automatically enabled if SEA is available)
await d2.SEA(); // Initialize with a new key pair
// or
await d2.SEA(existingKeyPair); // Initialize with existing keys

// Send encrypted messages
d2.send('peer-address', 'Hello, World!'); // Direct message
d2.send('Broadcast message'); // Broadcast to all peers

// Listen for messages
d2.on('message', (address, message) => {
  console.log(`Message from ${address}:`, message);
});

// Listen for decrypted messages
d2.on('decrypted', (address, pubkeys, message) => {
  console.log(`Decrypted message from ${address}:`, message);
});
```

### Event Handling

```javascript
// Listen for new peers
d2.events.on('newPeer', (peers) => {
  console.log('Updated peers list:', peers);
});

// Custom RPC registration
d2.register('customAction', (address, data, callback) => {
  // Handle custom action
  callback(result);
});
```

### Connection Management

```javascript
// Get your address
const myAddress = d2.address();

// Start heartbeat
d2.heartbeat(30000); // 30 second interval

// Cleanup
d2.destroy();
```

## API Reference

### Constructor

- `new Bugoff(identifier, opts, pair)`
  - `identifier`: Optional string for deterministic addressing
  - `opts`: Configuration options object
    - `seed`: Optional seed string for deterministic key generation
  - `pair`: Optional existing SEA key pair

### Methods

- `address()`: Returns the instance's address
- `SEA(pair?)`: Initializes encryption with optional existing key pair
- `send(address, message)`: Sends encrypted message to specific address
- `send(message)`: Broadcasts encrypted message to all peers
- `register(name, callback)`: Registers RPC handler
- `on(event, callback)`: Registers event listener
- `once(event, callback)`: Registers one-time event listener
- `heartbeat(interval)`: Starts connection heartbeat
- `destroy()`: Cleans up and closes connections

### Events

- `message`: Raw message received
- `decrypted`: Decrypted message received
- `seen`: New peer discovered
- `newPeer`: Peer list updated
- `encoded`: Message encrypted and ready to send

## Security Considerations

- Always initialize SEA for secure communication
- Use strong seeds if providing custom ones
- Keep private keys secure and never share them
- Monitor connection states in production environments
- Implement proper error handling for encryption/decryption failures

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details 