import { Bugoff } from './bugoff.js';

class D2Demo {
  constructor() {
    this.d2 = null;
    this.role = null;
    this.peers = new Map();
    this.initializeUI();
  }

  initializeUI() {
    // Get UI elements
    this.elements = {
      status: document.getElementById('status'),
      statusDot: document.querySelector('.status-dot'),
      serverBtn: document.getElementById('serverBtn'),
      clientBtn: document.getElementById('clientBtn'),
      addressDisplay: document.getElementById('addressDisplay'),
      copyAddress: document.getElementById('copyAddress'),
      peerCount: document.getElementById('peerCount'),
      messageList: document.getElementById('messageList'),
      messageInput: document.getElementById('messageInput'),
      sendBtn: document.getElementById('sendBtn'),
      peerList: document.getElementById('peerList')
    };

    // Add event listeners
    this.elements.serverBtn.addEventListener('click', () => this.startServer());
    this.elements.clientBtn.addEventListener('click', () => this.startClient());
    this.elements.copyAddress.addEventListener('click', () => this.copyAddressToClipboard());
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  async startServer() {
    if (this.d2) return;
    
    this.role = 'server';
    this.elements.serverBtn.classList.add('active');
    this.elements.clientBtn.disabled = true;

    try {
      // Initialize D2 instance
      this.d2 = new Bugoff();
      await this.d2.SEA(); // Initialize encryption
      
      // Update UI
      this.elements.addressDisplay.textContent = this.d2.address();
      this.updateStatus('Connected (Server)', true);
      
      // Setup event listeners
      this.setupD2EventListeners();
      
      // Start heartbeat
      this.d2.heartbeat(30000);
    } catch (error) {
      console.error('Failed to start server:', error);
      this.updateStatus('Server Error', false);
    }
  }

  async startClient() {
    if (this.d2) return;

    const serverAddress = prompt('Enter server address:');
    if (!serverAddress) return;

    this.role = 'client';
    this.elements.clientBtn.classList.add('active');
    this.elements.serverBtn.disabled = true;

    try {
      // Initialize D2 instance with server address
      this.d2 = new Bugoff(serverAddress);
      await this.d2.SEA(); // Initialize encryption
      
      // Update UI
      this.elements.addressDisplay.textContent = this.d2.address();
      this.updateStatus('Connected (Client)', true);
      
      // Setup event listeners
      this.setupD2EventListeners();
      
      // Start heartbeat
      this.d2.heartbeat(30000);
    } catch (error) {
      console.error('Failed to start client:', error);
      this.updateStatus('Client Error', false);
    }
  }

  setupD2EventListeners() {
    // Listen for new peers
    this.d2.events.on('newPeer', (peers) => {
      this.updatePeers(peers);
    });

    // Listen for messages
    this.d2.on('decrypted', (address, pubkeys, message) => {
      this.addMessage(address, message, false);
    });

    // Listen for connection events
    this.d2.on('seen', (address) => {
      this.addPeerToList(address);
    });
  }

  updateStatus(message, connected) {
    this.elements.status.textContent = message;
    this.elements.statusDot.classList.toggle('connected', connected);
  }

  updatePeers(peers) {
    this.peers = new Map(Object.entries(peers));
    this.elements.peerCount.textContent = this.peers.size;
    this.updatePeerList();
  }

  addPeerToList(address) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="peer-address">${address}</span>
      <span class="peer-status">Connected</span>
    `;
    this.elements.peerList.appendChild(li);
  }

  updatePeerList() {
    this.elements.peerList.innerHTML = '';
    this.peers.forEach((peer, address) => {
      this.addPeerToList(address);
    });
  }

  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    if (!message || !this.d2) return;

    try {
      // Broadcast message to all peers
      await this.d2.send(message);
      
      // Add message to UI
      this.addMessage(this.d2.address(), message, true);
      
      // Clear input
      this.elements.messageInput.value = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  addMessage(address, message, isSent) {
    const div = document.createElement('div');
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = `
      <small>${address.slice(0, 8)}...</small>
      <p>${message}</p>
    `;
    this.elements.messageList.appendChild(div);
    this.elements.messageList.scrollTop = this.elements.messageList.scrollHeight;
  }

  async copyAddressToClipboard() {
    if (!this.d2) return;
    
    try {
      await navigator.clipboard.writeText(this.d2.address());
      this.elements.copyAddress.textContent = '✓';
      setTimeout(() => {
        this.elements.copyAddress.textContent = '📋';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }
}

// Initialize the demo when the page loads
window.addEventListener('load', () => {
  new D2Demo();
}); 