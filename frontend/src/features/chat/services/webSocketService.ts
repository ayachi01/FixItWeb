// Lightweight WebSocket/pub-sub service used by ChatService
// Exported as default to match existing imports

export type MessageHandler<T = any> = (message: T) => void;

export default class WebSocketService {
  private subscribers: Set<MessageHandler> = new Set();
  private socket: WebSocket | null = null;

  // Optionally connect to a real WebSocket endpoint
  // If not used, the service still works in mock mode via sendMessage()
  connect(url?: string) {
    const wsUrl = url || import.meta.env.VITE_WS_URL;
    if (!wsUrl) return; // No URL provided; remain in mock mode

    // Close existing connection if any
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }

    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event: MessageEvent) => {
      let data: any = event.data;
      try {
        data = JSON.parse(event.data);
      } catch {
        // keep raw data if not JSON
      }
      this.broadcast(data);
    };

    this.socket.onerror = () => {
      // In a real app, add better error handling/retry logic
    };
  }

  // Subscribe to messages (mock or real). Returns an unsubscribe function
  subscribe<T = any>(handler: MessageHandler<T>): () => void {
    this.subscribers.add(handler as MessageHandler);
    return () => {
      this.subscribers.delete(handler as MessageHandler);
    };
  }

  // Send a message to all subscribers (used by mock flows)
  // If connected to a real WS, also send over the socket
  sendMessage<T = any>(message: T) {
    // Broadcast locally (mock behavior)
    this.broadcast(message);

    // Forward to server if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        this.socket.send(payload);
      } catch {
        // swallow send errors for now
      }
    }
  }

  // Close the socket and clear subscribers
  close() {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
  }

  // Notify all listeners
  private broadcast<T = any>(message: T) {
    this.subscribers.forEach((handler) => {
      try {
        (handler as MessageHandler<T>)(message);
      } catch (e) {
        // avoid breaking others
        console.error('WebSocketService handler error:', e);
      }
    });
  }
}