import { NextRequest, NextResponse } from 'next/server';
import { createWebSocketAdapter } from './websocket-adapter';
import { Duplex } from 'stream';
import { WebSocketServer as WSServer } from 'ws';
import { RedisWebSocketAdapter } from './websocket-adapter';
import { logger } from './logger';
import { IncomingMessage } from 'http';

// WebSocket handler interface
export interface WebSocketHandler {
  handleConnection(clientId: string, ws: WebSocket): void;
  close(): Promise<void>;
}

// Interface for connection handlers
interface ConnectionHandler {
  (socket: any, request: IncomingMessage): void;
}

// Create a singleton WebSocketServer
// Rename to avoid the naming conflict with imported WebSocketServer
class AppWebSocketServer {
  private wss: WSServer | null = null;
  private adapter: RedisWebSocketAdapter | null = null;
  private connectionHandlers: ConnectionHandler[] = [];
  private isInitialized = false;
  
  constructor() {
    if (typeof window === 'undefined') {
      this.adapter = new RedisWebSocketAdapter();
    }
  }
  
  async handleConnection(req: NextRequest): Promise<Response> {
    try {
      const { socket, response } = Reflect.get(req, 'socket') 
        ? { socket: Reflect.get(req, 'socket'), response: new Response() }
        : await new Promise<{ socket: Duplex; response: Response }>((resolve) => {
            const controller = new AbortController();
            const { signal } = controller;
            
            const upgradeResponse = NextResponse.next({ request: { headers: req.headers } });
            Reflect.set(upgradeResponse, 'socket', null);
            
            resolve({
              socket: Reflect.get(upgradeResponse, 'socket') as Duplex,
              response: upgradeResponse
            });
          });
          
      if (!socket) {
        return new Response('WebSocket upgrade failed', { status: 426 });
      }
      
      if (!this.wss) {
        this.wss = new WSServer({ noServer: true });
        
        this.wss.on('connection', (ws, req) => {
          const clientId = Math.random().toString(36).substring(2, 9);
          logger.info(`New WebSocket connection established: ${clientId}`);
          
          if (this.adapter) {
            this.adapter.handleConnection(clientId, ws as unknown as WebSocket);
          }
        });
      }
      
      const adapter = createWebSocketAdapter(req, socket);
      this.wss.handleUpgrade(adapter as any, socket, Buffer.from(''), (ws) => {
        this.wss!.emit('connection', ws, req);
      });
      
      return response;
    } catch (error) {
      logger.error('Error in WebSocket upgrade:', error);
      return new Response('WebSocket error', { status: 500 });
    }
  }

  // Initialize the WebSocket server
  initialize(server: any) {
    if (this.isInitialized) {
      logger.warn('WebSocketServer already initialized');
      return;
    }

    logger.info('Initializing WebSocket server');
    
    try {
      // Create WebSocket server attached to HTTP server
      this.wss = new WSServer({ 
        noServer: true,
        path: '/api/websocket'
      });
      
      // Handle new connections
      this.wss.on('connection', (socket, request) => {
        logger.info(`WebSocket connection established: ${request.socket.remoteAddress}`);
        
        // Register message listener
        socket.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            logger.debug(`WebSocket message received: ${JSON.stringify(data)}`);
            
            // Process message here if needed
          } catch (error) {
            logger.error('Error parsing WebSocket message', error);
          }
        });
        
        // Register close listener
        socket.on('close', () => {
          logger.info('WebSocket connection closed');
        });
        
        // Call all registered connection handlers
        this.connectionHandlers.forEach(handler => {
          try {
            handler(socket, request);
          } catch (error) {
            logger.error('Error in WebSocket connection handler', error);
          }
        });
      });
      
      // Handle upgrade requests
      server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
        // Only handle WebSocket upgrades for our path
        if (request.url?.startsWith('/api/websocket')) {
          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        }
      });
      
      // Mark as initialized
      this.isInitialized = true;
      logger.info('WebSocket server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', error);
      throw error;
    }
  }
  
  // Register a handler for new connections
  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler);
  }
  
  // Broadcast a message to all connected clients
  broadcast(message: any) {
    if (!this.wss) {
      logger.warn('WebSocketServer not initialized, cannot broadcast');
      return false;
    }
    
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    });
    
    return true;
  }
  
  // Get the number of connected clients
  getConnectionCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }
  
  // Close the WebSocket server
  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.isInitialized = false;
      logger.info('WebSocket server closed');
    }
  }
}

// Export singleton instance
export const webSocketServer = new AppWebSocketServer(); 