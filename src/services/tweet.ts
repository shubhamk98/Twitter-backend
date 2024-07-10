import { prismaClient } from "../Client/db";
import { redisClient } from "../Client/redis";

export interface CreateTweetPayload {
  content: string;
  imageUrl?: string;
  userId: string;
}

class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimit = await redisClient.get(`RATE_LIMIT_${data.userId}`);
    if (rateLimit) {
      throw new Error("Please Wait......");
    }
    const tweet = await prismaClient.tweet.create({
      data: {
        content: data.content,
        imageUrl: data.imageUrl,
        author: { connect: { id: data.userId } },
      },
    });
    await redisClient.setex(`RATE_LIMIT_${data.userId}`, 15, 1);
    await redisClient.del(`ALL_TWEETS`);
    return tweet;
  }

  public static async getAllTweet() {
    const cachedTweet = await redisClient.get(`ALL_TWEETS`);
    if (cachedTweet) {
      return JSON.parse(cachedTweet);
    }
    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
    });
    await redisClient.set(`ALL_TWEETS`, JSON.stringify(tweets));
    return tweets;
  }
}

export default TweetService;
