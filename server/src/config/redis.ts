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

export const getCache = async (key: string): Promise<string | null> => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const setCache = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  if (!isRedisConnected || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch {
    // Ignore cache failure
  }
};

export { redisClient, isRedisConnected };
