import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            // Stop retrying to avoid spamming logs when Redis is not installed locally
            return false;
          }
          return 1000;
        },
      },
    });

    redisClient.on('error', (err) => {
      if (!isRedisConnected) {
        // Suppress repeated connection logs if redis isn't running locally
        return;
      }
      console.warn(`[Redis Notice] ${err.message}`);
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log(`[Redis] Connected to ${redisUrl}`);
    });

    await redisClient.connect();
  } catch (err: any) {
    isRedisConnected = false;
    console.log(`[Redis] Running in local bypass mode (Redis offline or not configured). Caching falls back to memory.`);
  }
};

// In-Memory Fallback Cache with TTL and Bounded Size (O(1) access)
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 2000;

export const getCache = async (key: string): Promise<string | null> => {
  // 1. Check Redis if active
  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get(key);
      if (val !== null) return val;
    } catch {
      // Fall through to memory cache
    }
  }

  // 2. High-speed in-memory cache lookup
  const entry = memoryCache.get(key);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.value;
    }
    memoryCache.delete(key);
  }
  return null;
};

export const setCache = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  // 1. Write to in-memory cache
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    // Evict oldest entries
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // 2. Write to Redis if active
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttlSeconds, value);
    } catch {
      // Ignore redis write error
    }
  }
};

export { redisClient, isRedisConnected };
