import { NextRequest, NextResponse } from 'next/server';
import { createWebSocketAdapter } from './websocket-adapter';
import { Duplex } from 'stream';
import { WebSocketServer as WSServer } from 'ws';
import { RedisWebSocketAdapter } from './websocket-adapter';
import { logger } from './logger';

// WebSocket handler interface
export interface WebSocketHandler {
  handleConnection(clientId: string, ws: WebSocket): void;
  close(): Promise<void>;
}

// Create a singleton WebSocketServer
class WebSocketServer {
  private wss: WSServer | null = null;
  private adapter: RedisWebSocketAdapter | null = null;
  
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
      this.wss.handleUpgrade(adapter, socket, Buffer.from(''), (ws) => {
        this.wss!.emit('connection', ws, req);
      });
      
      return response;
    } catch (error) {
      logger.error('Error in WebSocket upgrade:', error);
      return new Response('WebSocket error', { status: 500 });
    }
  }
}

export const WebSocketServer = new WebSocketServer(); 