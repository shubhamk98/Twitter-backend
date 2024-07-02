import { prismaClient } from "../Client/db";

export interface CreateTweetPayload {
  content: string;
  imageUrl?: string;
  userId: string;
}

class TweetService {
  public static createTweet(data: CreateTweetPayload) {
    return prismaClient.tweet.create({
      data: {
        content: data.content,
        imageUrl: data.imageUrl,
        author: { connect: { id: data.userId } },
      },
    });
  }

  public static getAllTweet() {
    return prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } });
  }
}

export default TweetService;
