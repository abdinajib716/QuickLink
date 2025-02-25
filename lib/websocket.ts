import { getWebSocketUrl } from './get-websocket-url';

type WebSocketEvent = {
  type: 'link_added' | 'link_deleted';
  payload: any;
};

type WebSocketCallback = (event: any) => void;

type Subscription = {
  unsubscribe: () => void;
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers = new Set<(event: any) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private pollingInterval: any = null;
  private lastTimestamp = Date.now();
  private usePolling = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
      
      // Set up connection checking interval
      this.connectionCheckInterval = setInterval(() => {
        this.checkConnection();
      }, 10000); // Check connection every 10 seconds
    }
  }

  private checkConnection() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket connection check failed, reconnecting...');
      this.connect();
    }
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = getWebSocketUrl();
    console.log('Attempting WebSocket connection to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Request initial state after connection
        this.requestInitialState();
        
        // Stop polling if we were using it as fallback
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          // Use MessageEvent.data directly when possible
          const data = typeof event.data === 'string' 
            ? JSON.parse(event.data) 
            : event.data;
          
          // Prioritize critical message types
          if (data.type === 'link_added' || data.type === 'link_deleted') {
            // Process immediately without logging to reduce latency
            this.subscribers.forEach(callback => {
              try {
                callback(data);
              } catch (error) {
                console.error('Error in subscriber callback:', error);
              }
            });
            
            // Log after processing to not block UI updates
            console.log(`Processed ${data.type} event with ID:`, 
              data.payload._id || data.payload.id);
          } else {
            // For non-critical messages, log first then process
            console.log('WebSocket message received:', data);
            this.broadcastToSubscribers(data);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed (${event.code}): ${event.reason}`);
        this.isConnecting = false;
        this.ws = null;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectAttempts++;
          this.reconnectDelay *= 1.5; // Exponential backoff
        } else {
          console.log('Max reconnection attempts reached, falling back to polling');
          this.startPolling();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't close here, let the onclose handler deal with reconnection
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectAttempts++;
      } else {
        this.startPolling();
      }
    }
  }
  
  private broadcastToSubscribers(data: any) {
    console.log(`Broadcasting to ${this.subscribers.size} subscribers`);
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }
  
  private requestInitialState() {
    console.log('Requesting initial state...');
    
    // Could implement a special message to get initial state
    // For now, just refresh data via API call
    fetch('/api/links')
      .then(res => res.json())
      .then(data => {
        this.broadcastToSubscribers({
          type: 'initial_state',
          payload: data
        });
      })
      .catch(err => console.error('Error fetching initial state:', err));
  }

  private startPolling() {
    if (this.pollingInterval) return;
    console.log('Starting polling fallback...');
    this.usePolling = true;
    
    // Poll every 3 seconds if WebSocket isn't working
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/updates?since=${this.lastTimestamp}`);
        if (response.ok) {
          const data = await response.json();
          
          // Process each update
          if (data.updates && data.updates.length > 0) {
            console.log('Received updates via polling:', data.updates);
            data.updates.forEach((update: any) => {
              this.broadcastToSubscribers(update);
            });
          }
          
          // Update the timestamp for next polling
          this.lastTimestamp = data.timestamp || Date.now();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  }

  subscribe(callback: (event: any) => void) {
    console.log('New subscriber added');
    this.subscribers.add(callback);
    return {
      unsubscribe: () => {
        console.log('Subscriber removed');
        this.subscribers.delete(callback);
      }
    };
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    this.subscribers.clear();
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

export { broadcaster } from '@/lib/websocket-broadcaster';
