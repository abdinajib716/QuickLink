import Redis from 'ioredis';
import { getRedisClient, publishMessage } from './redis-helper';
import { logger } from './logger';

// Ensure Redis is only imported on the server
let RedisClient: typeof Redis | null = null;
if (typeof window === 'undefined') {
  // Only import Redis on the server
  RedisClient = Redis;
}

type WebSocketMessage = {
  type: string;
  payload: any;
  timestamp?: number;
};

class WebSocketBroadcaster {
  async broadcast(message: WebSocketMessage) {
    if (typeof window !== 'undefined') {
      // Skip Redis broadcasting in browser
      return null;
    }

    try {
      // Ensure the message has a timestamp
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      
      // Add an ID to the message for tracking
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const enhancedMessage = {
        ...message,
        id: messageId
      };
      
      logger.startTimer(`broadcast-${messageId}`);
      
      // Use the helper function to publish the message
      const serializedMessage = JSON.stringify(enhancedMessage);
      const success = await publishMessage('websocket_messages', serializedMessage);
      
      const duration = logger.endTimer(`broadcast-${messageId}`);
      
      if (success) {
        logger.info(`Message ${messageId} broadcast in ${duration.toFixed(2)}ms`);
      } else {
        logger.warn(`Failed to broadcast message ${messageId}`);
      }
      
      return messageId;
    } catch (error) {
      logger.error('Failed to broadcast message:', error);
      return null;
    }
  }
}

// Singleton instance
export const broadcaster = new WebSocketBroadcaster(); 