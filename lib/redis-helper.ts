import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// In-memory fallback for environments without Redis
class MemoryStore {
  private store = new Map<string, string>();

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async del(key: string): Promise<number> {
    const had = this.store.has(key);
    this.store.delete(key);
    return had ? 1 : 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    logger.info(`[MemoryStore] Publishing to ${channel}: ${message}`);
    return 0;
  }

  async subscribe(channel: string): Promise<void> {
    logger.info(`[MemoryStore] Subscribed to ${channel}`);
  }
}

// Either use Redis or fallback to memory store
let redisClient: Redis | MemoryStore;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    logger.info('Redis client initialized');
  } catch (error) {
    logger.error('Failed to initialize Redis client, using memory store', error);
    redisClient = new MemoryStore();
  }
} else {
  logger.info('No REDIS_URL provided, using memory store');
  redisClient = new MemoryStore();
}

export { redisClient };

// Global Redis client instance for connection pooling
let globalRedisClient: Redis | null = null;

// Track if we're in the process of connecting
let isConnecting = false;

// Keep track of last error time to prevent rapid reconnection attempts
let lastErrorTime = 0;
const ERROR_COOLDOWN_MS = 5000; // 5 seconds between reconnection attempts

export async function getRedisClient(): Promise<Redis | null> {
  // If we already have a client and it's ready, return it
  if (globalRedisClient?.status === 'ready') {
    return globalRedisClient;
  }
  
  // If we're already trying to connect, don't start another connection
  if (isConnecting) {
    logger.debug('Redis connection already in progress');
    // Wait for the existing connection attempt
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(globalRedisClient);
      }, 100);
    });
  }
  
  // Check error cooldown
  const now = Date.now();
  if (now - lastErrorTime < ERROR_COOLDOWN_MS) {
    logger.warn('Redis connection on cooldown after error, waiting...');
    return null;
  }

  try {
    isConnecting = true;
    logger.info('Creating new Redis client connection');
    
    // Clean up existing connection if it exists
    if (globalRedisClient) {
      try {
        await globalRedisClient.quit();
      } catch (e) {
        logger.error('Error closing previous Redis connection', e);
      }
      globalRedisClient = null;
    }
    
    // Create new connection
    globalRedisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      enableOfflineQueue: false,
      lazyConnect: false, // Connect immediately
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 3000);
        logger.debug(`Redis retry attempt ${times}, delaying ${delay}ms`);
        return delay;
      }
    });
    
    // Set up event handlers
    globalRedisClient.on('connect', () => {
      logger.info('Redis client connected successfully');
      isConnecting = false;
    });
    
    globalRedisClient.on('error', (error) => {
      logger.error('Redis client error', error);
      lastErrorTime = Date.now();
      isConnecting = false;
    });
    
    // Return the client
    return globalRedisClient;
  } catch (error) {
    logger.error('Failed to create Redis client', error);
    isConnecting = false;
    lastErrorTime = Date.now();
    return null;
  }
}

// Helper for safely publishing messages
export async function publishMessage(channel: string, message: any): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logger.warn(`Cannot publish to ${channel} - no Redis connection`);
      return false;
    }
    
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await redis.publish(channel, payload);
    return true;
  } catch (error) {
    logger.error(`Failed to publish to ${channel}`, error);
    return false;
  }
}

// Clean up Redis on application shutdown
if (typeof process !== 'undefined') {
  ['SIGINT', 'SIGTERM', 'beforeExit'].forEach(signal => {
    process.on(signal as any, async () => {
      logger.info('Shutting down Redis connections');
      if (globalRedisClient) {
        try {
          await globalRedisClient.quit();
          logger.info('Redis connection closed gracefully');
        } catch (e) {
          logger.error('Error closing Redis connection', e);
        }
      }
    });
  });
}

// Consider using only the MemoryStore implementation for simplicity
// Especially if you're not using advanced Redis features 