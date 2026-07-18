import { Redis } from "ioredis";
import type { Cache } from "../../application/ports/cache";

export function createRedisCache(redisUrl: string): Cache {
  const redis = new Redis(redisUrl);

  return {
    async get<T>(key: string) {
      const raw = await redis.get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    },
    async set<T>(key: string, value: T, ttlSeconds: number) {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    },
  };
}
