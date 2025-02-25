import { NextRequest } from 'next/server'
import { Duplex } from 'stream'
import Redis from 'ioredis'
import { IncomingMessage } from 'http'
import { WebSocketHandler } from '@/lib/websocket-server'
import { getRedisClient } from './redis-helper'
import { logger } from './logger'

// This is a more complete adapter to make Next.js WebSocket work with the ws library
export function createWebSocketAdapter(req: NextRequest, socket: Duplex): IncomingMessage {
  // Create a basic adapter with the minimum required properties
  const adapter = {
    headers: Object.fromEntries(req.headers.entries()),
    method: req.method,
    url: req.url,
    socket,
    connection: socket,
    // Add these properties to satisfy IncomingMessage
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    httpVersion: '1.1',
    // Add other required properties
  } as IncomingMessage;
  
  return adapter;
}

export class RedisWebSocketAdapter implements WebSocketHandler {
  private subscriber: Redis | null = null
  private clients = new Map<string, WebSocket>()
  private messageBuffer: any[] = []
  private isSubscribed = false
  private reconnectTimeout: NodeJS.Timeout | null = null
  
  constructor() {
    this.setupRedis()
  }
  
  private async setupRedis() {
    try {
      this.subscriber = await getRedisClient()
      
      if (!this.subscriber) {
        logger.warn('Failed to get Redis client, will retry later')
        this.scheduleReconnect()
        return
      }
      
      // Set up event handlers
      this.subscriber.on('message', (channel, message) => {
        if (channel === 'websocket_messages') {
          this.broadcastToClients(message)
        }
      })
      
      // Subscribe to the channel
      await this.subscriber.subscribe('websocket_messages')
      this.isSubscribed = true
      logger.info('Successfully subscribed to websocket_messages channel')
      
      // Broadcast any messages that came in while we were connecting
      this.flushMessageBuffer()
    } catch (error) {
      logger.error('Error setting up Redis subscription:', error)
      this.scheduleReconnect()
    }
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    
    this.reconnectTimeout = setTimeout(() => {
      logger.info('Attempting to reconnect Redis subscriber')
      this.setupRedis()
    }, 5000) // Try again in 5 seconds
  }
  
  private flushMessageBuffer() {
    if (this.messageBuffer.length > 0) {
      logger.info(`Broadcasting ${this.messageBuffer.length} buffered messages`)
      this.messageBuffer.forEach(msg => this.broadcastToClients(msg))
      this.messageBuffer = []
    }
  }
  
  // Handle new WebSocket connections
  handleConnection(clientId: string, ws: WebSocket) {
    logger.info(`Client ${clientId} connected`)
    this.clients.set(clientId, ws)
    
    ws.onclose = () => {
      logger.info(`Client ${clientId} disconnected`)
      this.clients.delete(clientId)
    }
  }
  
  // Broadcast message to all connected clients
  private broadcastToClients(message: string) {
    if (!this.isSubscribed) {
      // Buffer the message for later delivery
      this.messageBuffer.push(message)
      return
    }
    
    logger.startTimer('broadcast-to-clients')
    
    const clientCount = this.clients.size
    if (clientCount === 0) {
      logger.debug('No WebSocket clients connected, skipping broadcast')
      return
    }
    
    let sentCount = 0
    this.clients.forEach((ws, clientId) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message)
          sentCount++
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          // Clean up closed connections
          this.clients.delete(clientId)
        }
      } catch (error) {
        logger.error(`Error sending to client ${clientId}:`, error)
        // Remove problematic clients
        this.clients.delete(clientId)
      }
    })
    
    const duration = logger.endTimer('broadcast-to-clients')
    logger.info(`Broadcast message to ${sentCount}/${clientCount} clients in ${duration.toFixed(2)}ms`)
  }
  
  // Close all connections when shutting down
  async close() {
    logger.info('Closing Redis WebSocket adapter')
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    // Close all client connections
    this.clients.forEach((ws) => {
      try {
        ws.close(1000, 'Server shutting down')
      } catch (e) {
        // Ignore errors during close
      }
    })
    this.clients.clear()
    
    // We don't close the Redis client here since it's shared
  }
} 