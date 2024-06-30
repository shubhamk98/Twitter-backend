import { Tweet } from "@prisma/client";
import { prismaClient } from "../../Client/db";
import { GraphqlContext } from "../../interfaces";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface CreateTweetPayload {
  content: string;
  imageUrl?: string;
}

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
  getAllTweet: () =>
    prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } }),
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
      "png",
      "gif",
      "bmp",
      "webp",
      "jpeg",
      "jpg",
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

    const tweet = await prismaClient.tweet.create({
      data: {
        content: payload.content,
        imageUrl: payload.imageUrl,
        author: { connect: { id: ctx.user.id } },
      },
    });
    return tweet;
  },
};

const extraResolvers = {
  Tweet: {
    author: (parent: Tweet) =>
      prismaClient.user.findUnique({ where: { id: parent.aurthorID } }),
  },
};

export const resolvers = { mutations, extraResolvers, queries };
