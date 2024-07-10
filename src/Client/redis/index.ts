import Redis from "ioredis";

const redisStr = process.env.REDIS_STRING;

if (!redisStr) {
  throw new Error("REDIS_STRING is not defined in the environment variables");
}

export const redisClient = new Redis(redisStr);
