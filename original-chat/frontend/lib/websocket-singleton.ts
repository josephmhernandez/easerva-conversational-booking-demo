// frontend/lib/websocket-singleton.ts
// Global singleton to ensure only one WebSocket connection exists at a time
// This prevents React Strict Mode from creating multiple connections

import type { ClientEvent, ServerEvent } from "@shared/protocol";
import { SecureChatWebSocketClient } from "./websocket-client";

type ConnectionCallbacks = {
  onMessage: (message: ServerEvent) => void;
  onError: (error: Event) => void;
  onClose: () => void;
  onConnectionEstablished?: (connectionId: string) => void;
};

class WebSocketSingleton {
  private static instance: WebSocketSingleton | null = null;
  private client: SecureChatWebSocketClient | null = null;
  private callbacks: Map<string, ConnectionCallbacks> = new Map();
  private connectionId = 0;
  private isConnecting = false;
  private lastConnectionOpts: { sessionId?: string; lastSeqSeen?: number } | undefined;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): WebSocketSingleton {
    if (!WebSocketSingleton.instance) {
      WebSocketSingleton.instance = new WebSocketSingleton();
    }
    return WebSocketSingleton.instance;
  }

  // Register a component's callbacks and get a unique connection ID
  register(callbacks: ConnectionCallbacks): string {
    const id = `conn_${++this.connectionId}`;
    this.callbacks.set(id, callbacks);
    console.log(`📝 Registered WebSocket callbacks for ${id}. Total: ${this.callbacks.size}`);
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    return id;
  }

  // Unregister a component's callbacks
  unregister(id: string): void {
    this.callbacks.delete(id);
    console.log(`🗑️ Unregistered WebSocket callbacks for ${id}. Remaining: ${this.callbacks.size}`);

    // If no more components are listening, disconnect
    if (this.callbacks.size === 0 && !this.disconnectTimer) {
      console.log("🔌 No more listeners, scheduling   disconnect of WebSocket");
      this.disconnectTimer = setTimeout(() => {
        if (this.callbacks.size === 0) {
          this.forceDisconnect();
        }
        this.disconnectTimer = null;
      }, 5000);
    }
  }

  // Connect or return existing connection
  async connect(opts?: {
    sessionId?: string;
    lastSeqSeen?: number;
  }): Promise<SecureChatWebSocketClient> {
    // If already connected and options haven't changed, return existing client
    if (this.client?.isConnected() && this.optionsEqual(opts, this.lastConnectionOpts)) {
      console.log("♻️ Reusing existing WebSocket connection");
      return this.client;
    }

    // If already connecting, wait for it to complete
    if (this.isConnecting) {
      console.log("⏳ WebSocket connection already in progress, waiting...");
      return new Promise((resolve, reject) => {
        const maxWaitTime = 10000; // 10 seconds max wait
        const startTime = Date.now();

        const checkConnection = () => {
          if (Date.now() - startTime > maxWaitTime) {
            console.log("⏰ Connection wait timeout, resetting state");
            // Reset connecting state and let caller handle retry
            this.isConnecting = false;
            reject(new Error("Connection timeout"));
            return;
          }

          if (!this.isConnecting) {
            if (this.client?.isConnected()) {
              resolve(this.client);
            } else {
              // Connection attempt finished but failed - don't reject,
              // let the caller handle the retry
              console.log(
                "🔄 Connection attempt finished but not connected - allowing caller to retry"
              );
              resolve(null as unknown as SecureChatWebSocketClient); // Resolve with null to let caller handle retry
            }
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    // Store connection options
    this.lastConnectionOpts = opts;
    this.isConnecting = true;

    try {
      console.log("🔌 Creating new WebSocket connection...");
      // Clean up any existing connection
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }

      // Create new client with multiplexed handlers
      this.client = new SecureChatWebSocketClient(
        this.handleMessage.bind(this),
        this.handleError.bind(this),
        this.handleClose.bind(this),
        this.handleConnectionEstablished.bind(this)
      );

      await this.client.connect(opts);
      console.log("✅ WebSocket connection established");
      return this.client;
    } catch (error) {
      console.error("❌ WebSocket connection failed:", error);
      this.client = null;
      this.lastConnectionOpts = undefined;
      // Don't throw error - return null and let caller handle retry
      console.log("🔄 Connection failed, will retry on next connect call");
      throw error; // Still throw to maintain error handling contract
    } finally {
      this.isConnecting = false;
    }
  }

  // Get the current client (may be null)
  getClient(): SecureChatWebSocketClient | null {
    return this.client;
  }

  // Check if connected
  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  // Send message through the singleton connection
  sendMessage(message: ClientEvent): void {
    if (!this.client?.isConnected()) {
      throw new Error("WebSocket not connected");
    }
    this.client.sendMessage(message);
  }

  // Force disconnect (used when no more components are listening)
  private forceDisconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.lastConnectionOpts = undefined;
  }

  // Force reconnect with fresh authentication
  async forceReconnect(): Promise<void> {
    console.log("🔄 Force reconnecting WebSocket singleton...");
    this.forceDisconnect();
    if (this.callbacks.size > 0) {
      await this.connect(this.lastConnectionOpts);
    }
  }

  // Helper to compare connection options
  private optionsEqual(
    opts1: { sessionId?: string; lastSeqSeen?: number } | undefined,
    opts2: { sessionId?: string; lastSeqSeen?: number } | undefined
  ): boolean {
    if (!opts1 && !opts2) return true;
    if (!opts1 || !opts2) return false;
    return opts1.sessionId === opts2.sessionId && opts1.lastSeqSeen === opts2.lastSeqSeen;
  }

  // Multiplex message handler - call all registered callbacks
  private handleMessage(message: ServerEvent): void {
    this.callbacks.forEach((callbacks) => {
      try {
        callbacks.onMessage(message);
      } catch (error) {
        console.error("Error in message callback:", error);
      }
    });
  }

  // Multiplex error handler - call all registered callbacks
  private handleError(error: Event): void {
    this.callbacks.forEach((callbacks) => {
      try {
        callbacks.onError(error);
      } catch (err) {
        console.error("Error in error callback:", err);
      }
    });
  }

  // Multiplex close handler - call all registered callbacks
  private handleClose(): void {
    this.callbacks.forEach((callbacks) => {
      try {
        callbacks.onClose();
      } catch (error) {
        console.error("Error in close callback:", error);
      }
    });
  }

  // Multiplex connection established handler - call all registered callbacks
  private handleConnectionEstablished(connectionId: string): void {
    this.callbacks.forEach((callbacks) => {
      try {
        callbacks.onConnectionEstablished?.(connectionId);
      } catch (error) {
        console.error("Error in connection established callback:", error);
      }
    });
  }
}

export const webSocketSingleton = WebSocketSingleton.getInstance();
