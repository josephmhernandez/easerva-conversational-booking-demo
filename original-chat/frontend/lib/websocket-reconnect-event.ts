// Event system for triggering WebSocket reconnection when authentication changes
export class WebSocketReconnectEventEmitter {
  private listeners: Set<() => void> = new Set();

  // Add a listener for reconnection events
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Trigger reconnection for all listeners
  triggerReconnect(): void {
    console.log("🔄 Triggering WebSocket reconnection for authentication change");
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in WebSocket reconnect callback:", error);
      }
    });
  }
}

// Global instance for the application
export const webSocketReconnectEmitter = new WebSocketReconnectEventEmitter();
