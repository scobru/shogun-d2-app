(function () {
  function Bugoff(identifier, opts) {
    console.log("🔧 Bugoff initialization started", { identifier, opts });

    // Handle different initialization patterns
    if (typeof identifier === "object" && !opts) {
      opts = identifier;
      identifier = undefined;
      console.log("🔧 Bugoff: Using object as options");
    }

    this.events = new EventEmitter();
    this.opts = opts || {};
    console.log("🔧 Bugoff: Events and options initialized");

    // Handle seed properly to avoid checksum errors
    if (this.opts.seed) {
      try {
        // Try to validate the seed format
        if (typeof this.opts.seed !== "string" || this.opts.seed.length < 5) {
          console.warn("Invalid seed format, generating a new one");
          delete this.opts.seed;
        }
      } catch (e) {
        console.warn("Error validating seed, generating a new one:", e);
        delete this.opts.seed;
      }
    }

    // Initialize Bugout with proper parameters
    try {
      console.log("🔧 Bugoff: Attempting to create Bugout instance");

      // Create Bugout instance without seed first if we have an identifier
      if (identifier) {
        console.log("🔧 Bugoff: Creating with identifier:", identifier);
        this.bugout = new Bugout(identifier);
      } else {
        // Create with options (possibly including seed) if no identifier
        console.log("🔧 Bugoff: Creating with options:", this.opts);
        this.bugout = new Bugout(this.opts);
      }

      console.log("🔧 Bugoff: Bugout instance created successfully");

      this.seed = this.bugout.seed;
      this.identifier = this.bugout.identifier;
      this.ID = sha(this.identifier);

      // Store address as property but also provide it as a method
      this._address = this.bugout.address();
      this.address = function () {
        return this._address;
      };

      console.log("🔧 Bugoff: Properties initialized", {
        seed: this.seed ? "Present" : "None",
        identifier: this.identifier,
        address: this._address,
      });
    } catch (error) {
      console.error("🔧 Bugoff: Error initializing Bugout:", error);
      // Try again with a fresh instance without seed or identifier
      try {
        console.log("🔧 Bugoff: Retrying with a fresh Bugout instance...");
        this.bugout = new Bugout();
        this.seed = this.bugout.seed;
        this.identifier = this.bugout.identifier;
        this.ID = sha(this.identifier);

        // Store address as property but also provide it as a method
        this._address = this.bugout.address();
        this.address = function () {
          return this._address;
        };

        console.log("🔧 Bugoff: Retry successful");
      } catch (retryError) {
        console.error(
          "🔧 Bugoff: Fatal error initializing Bugout:",
          retryError
        );
        throw retryError;
      }
    }

    this.peers = {};
    this.SEA = async (pair) => {
      this.sea = pair || (await SEA.pair());
      return this.sea;
    };

    // Bugout internals bindings
    this.on = this.bugout.on.bind(this.bugout);
    this.once = this.bugout.once.bind(this.bugout);
    this.register = this.bugout.register.bind(this.bugout);
    this.rpc = this.bugout.rpc.bind(this.bugout);
    this.heartbeat = (interval) => {
      // Hearbeat patch while waiting for Bugout update in NPM
      return this.bugout.heartbeat(interval);
    };
    this.destroy = this.bugout.destroy.bind(this.bugout);
    this.send = this.bugout.send.bind(this.bugout); // Add direct send method for compatibility

    console.log("🔧 Bugoff: Bugout methods bound successfully");

    // Add connection event logging
    this.bugout.on("server", () => {
      console.log("🔧 Bugoff: Server event triggered");
    });

    this.bugout.on("seen", (address) => {
      console.log("🔧 Bugoff: Peer seen:", address);
    });

    this.bugout.on("wireseen", (count) => {
      console.log("🔧 Bugoff: Wire seen, count:", count);
    });

    this.bugout.on("wireleft", (count) => {
      console.log("🔧 Bugoff: Wire left, count:", count);
    });

    this.bugout.on("error", (error) => {
      console.error("🔧 Bugoff: Bugout error:", error);
    });

    // Bugoff encryption features
    this.encryptionEnabled = false;

    // Setup encryption only if SEA is available
    if (typeof SEA !== "undefined") {
      this.encryptionEnabled = true;

      // Override the default send method with encrypted version
      const originalSend = this.send;

      this.events.on("encoded", (encrypted) => {
        if (typeof encrypted === "object")
          originalSend(encrypted[0], encrypted[1]);
        else originalSend(this.address(), encrypted);
      });

      this.on("message", async (address, message) => {
        // Try to decrypt if encryption is enabled
        if (this.encryptionEnabled && this.sea) {
          try {
            let decrypted = await decrypt(address, message);
            let addr = decrypted.address;
            let pubkeys = decrypted.pubkeys;
            let msg = decrypted.message;
            if (decrypted && msg)
              this.bugout.emit("decrypted", addr, pubkeys, msg);
          } catch (e) {
            // If decryption fails, treat as normal message
            console.log("Decryption failed, treating as normal message");
          }
        }
      });

      let encrypt = async (address, message) => {
        // If encryption not enabled or SEA not initialized, use original send
        if (!this.encryptionEnabled || !this.sea) {
          return originalSend(address, message);
        }

        // Wait for peers if none available
        if (Object.keys(this.peers).length === 0) {
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error("Timeout waiting for peers"));
              }, 5000);

              this.events.once("newPeer", () => {
                clearTimeout(timeout);
                resolve();
              });
            });
          } catch (e) {
            console.warn(
              "No peers available for encryption, sending unencrypted"
            );
            return originalSend(address, message);
          }
        }

        if (!message) {
          let msg = address;
          // this is a broadcast message, encrypt with this instance SEA pair
          for (let peer in this.peers) {
            try {
              let enc = [
                peer,
                await SEA.encrypt(
                  msg,
                  await SEA.secret(this.peers[peer].epub, this.sea)
                ),
              ];
              this.events.emit("encoded", enc);
            } catch (e) {
              console.error("Encryption error:", e);
            }
          }
        } else if (message) {
          // this is a direct message
          try {
            if (this.peers[address] && this.peers[address].epub) {
              let enc = await SEA.encrypt(
                message,
                await SEA.secret(this.peers[address].epub, this.sea)
              );
              this.events.emit("encoded", [address, enc]);
            } else {
              // Fallback to unencrypted if peer key not available
              originalSend(address, message);
            }
          } catch (e) {
            console.error("Encryption error:", e);
            originalSend(address, message);
          }
        }
      };

      // Replace send with encrypt only if encryption is enabled
      if (this.encryptionEnabled) {
        this.encryptedSend = encrypt;
        // Keep original send available but use encrypted by default
        this.send = encrypt;
      }

      let decrypt = async (address, message) => {
        let pubkeys = null;
        for (let peer in this.peers) {
          if (peer === address) {
            pubkeys = {
              pub: this.peers[peer].pub,
              epub: this.peers[peer].epub,
            };
          }
        }

        if (!pubkeys || !this.sea) {
          return { address: address, pubkeys: null, message: message };
        }

        try {
          let decryptedMsg = await SEA.decrypt(
            message,
            await SEA.secret(this.peers[address].epub, this.sea)
          );
          return { address: address, pubkeys: pubkeys, message: decryptedMsg };
        } catch (e) {
          console.error("Decryption error:", e);
          return { address: address, pubkeys: pubkeys, message: message };
        }
      };

      this.register("peer", (address, sea, cb) => {
        if (sea && sea.pub && sea.epub) {
          Object.assign(this.peers, {
            [address]: { pub: sea.pub, epub: sea.epub },
          });
          this.events.emit("newPeer", this.peers);
          if (cb) cb(true);
        } else {
          if (cb) cb(false);
        }
      });

      this.on("seen", async (address) => {
        if (this.sea) {
          this.rpc(address, "peer", await this.sea);
        }
      });
    }
  }

  function sha(input) {
    // Use CryptoJS for browser compatibility
    if (!input) return "";
    return CryptoJS.SHA256(JSON.stringify(input)).toString(CryptoJS.enc.Hex);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Bugoff;
  } else {
    window.Bugoff = Bugoff;
  }
})();
