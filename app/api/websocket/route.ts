import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import Redis from 'ioredis'
import { createWebSocketAdapter } from '@/lib/websocket-adapter'

// Store active connections
let wss: WebSocketServer | null = null

export const runtime = 'nodejs'; // Force Node.js runtime for this route

export async function GET(request: NextRequest) {
  try {
    // Check if the request is a WebSocket upgrade request
    const { socket: res } = request as any
    const { socket: connectionSocket } = res
    
    // Only setup WebSocketServer once
    if (!wss) {
      wss = new WebSocketServer({ noServer: true })
      
      // Setup Redis pub/sub for broadcasting messages to all clients
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
      redis.subscribe('websocket_messages')
      
      redis.on('message', (_channel, message) => {
        console.log('📥 Redis message received, broadcasting to WebSocket clients:', message);
        
        // Ensure the message is valid before broadcasting
        try {
          // Validate message format by parsing and re-stringifying
          // This ensures we have valid JSON
          const parsedMessage = JSON.parse(message);
          const validatedMessage = JSON.stringify(parsedMessage);
          
          if (wss) {
            let clientCount = 0;
            wss.clients.forEach((client) => {
              if (client.readyState === client.OPEN) {
                try {
                  client.send(validatedMessage);
                  clientCount++;
                } catch (error) {
                  console.error('Error sending to client:', error);
                }
              }
            });
            console.log(`📤 Message sent to ${clientCount} WebSocket clients`);
          }
        } catch (error) {
          console.error('Invalid message format from Redis:', error);
        }
      })
      
      // Handle WebSocket close events to clean up resources
      wss.on('close', () => {
        redis.quit()
        wss = null
      })
      
      // Add error handling
      wss.on('error', (error) => {
        console.error('WebSocket server error:', error)
      })
    }
    
    // Handle upgrade
    const headers = request.headers
    const upgradeHeader = headers.get('upgrade') || ''
    
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: WebSocket', { status: 426 })
    }
    
    // Create a compatible adapter for the WebSocketServer
    const wsAdapter = createWebSocketAdapter(request, connectionSocket)
    
    // Handle the upgrade with error handling
    try {
      wss.handleUpgrade(wsAdapter as any, connectionSocket, Buffer.from([]), (ws) => {
        console.log('📲 New WebSocket client connected');
        wss!.emit('connection', ws, wsAdapter)
        
        // Setup individual client connection handlers
        ws.on('error', (error) => {
          console.error('WebSocket client error:', error)
        })
        
        ws.on('close', () => {
          console.log('📴 WebSocket client disconnected');
        })
      })
    } catch (error) {
      console.error('WebSocket upgrade error:', error)
      return new Response('WebSocket upgrade failed', { status: 500 })
    }
    
    // Keep the connection alive - don't return a response
    return new Response(null)
  } catch (error) {
    console.error('WebSocket error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 