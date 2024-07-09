import { Tweet } from "@prisma/client";
import { GraphqlContext } from "../../interfaces";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "../../services/user";
import TweetService, { CreateTweetPayload } from "../../services/tweet";

const accessKeyId = process.env.S3_Access_Key;
const secretAccessKey = process.env.AWS_Secret_access_key;

if (!accessKeyId || !secretAccessKey) {
  throw new Error(
    "S3 credentials are not defined in the environment variables."
  );
}

const s3Client = new S3Client({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: "ap-south-1",
});

const queries = {
  getAllTweet: () => TweetService.getAllTweet(),

  getSignedUrlForTweet: async (
    parent: any,
    { imageName, imageType }: { imageName: string; imageType: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) {
      throw new Error("Unauthenticated");
    }
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedImageTypes.includes(imageType)) {
      throw new Error("Unsupported Image type");
    }

    const putObjectCmd = new PutObjectCommand({
      Bucket: "twitter-dev-101",
      Key: `upload/${
        ctx.user.id
      }/tweets/${imageName}-${Date.now().toString()}.${imageType}`,
    });

    const expiresIn = 3 * 60;
    const signedUrl = await getSignedUrl(s3Client, putObjectCmd, { expiresIn });

    return signedUrl;
  },
};

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) {
      throw new Error("You are not authenticated");
    }

    const tweet = await TweetService.createTweet({
      ...payload,
      userId: ctx.user.id,
    });
    return tweet;
  },
};

const extraResolvers = {
  Tweet: {
    author: (parent: Tweet) => UserService.getUserById(parent.aurthorID),
  },
};

export const resolvers = { mutations, extraResolvers, queries };
