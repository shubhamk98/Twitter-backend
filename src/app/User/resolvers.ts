import { prismaClient } from "../../Client/db";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../Client/redis";

const queries = {
  verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
    const resultToken = await UserService.verifyGoogleToken(token);
    return resultToken;
  },
  getCurrentUser: async (parent: any, args: any, ctx: GraphqlContext) => {
    const id = ctx.user?.id;
    if (!id) {
      return null;
    }

    const user = await UserService.getUserById(id);

    return user;
  },
  getUserById: async (
    parent: any,
    { id }: { id: string },
    ctx: GraphqlContext
  ) => UserService.getUserById(id),
};

const extraResolvers = {
  User: {
    tweets: (parent: User) =>
      prismaClient.tweet.findMany({
        where: { author: { id: parent.id } },
        orderBy: { createdAt: "desc" },
      }),
    followers: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { following: { id: parent.id } },
        include: {
          follower: true,
        },
      });
      return result.map((el) => el.follower);
    },
    following: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { follower: { id: parent.id } },
        include: {
          following: true,
        },
      });
      return result.map((el) => el.following);
    },
    recommendedUsers: async (parent: User, _: any, ctx: GraphqlContext) => {
      if (!ctx.user) return [];
      const cachedVal = await redisClient.get(
        `RECOMMENDED_USER_${ctx.user.id}`
      );

      if (cachedVal) {
        return JSON.parse(cachedVal);
      }
      const myFollowings = await prismaClient.follows.findMany({
        where: {
          follower: { id: ctx.user.id },
        },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });

      const users: User[] = [];

      for (const followings of myFollowings) {
        for (const followingOfFollowedUser of followings.following.followers) {
          if (
            followingOfFollowedUser.following.id !== ctx.user.id &&
            myFollowings.findIndex(
              (e) => e?.followingId === followingOfFollowedUser.following.id
            ) < 0
          ) {
            users.push(followingOfFollowedUser.following);
          }
        }
      }

      await redisClient.set(
        `RECOMMENDED_USER_${ctx.user.id}`,
        JSON.stringify(users)
      );

      return users;
    },
  },
};

const mutation = {
  followUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) {
      throw new Error("Unathenticated");
    }
    await UserService.followUser(ctx.user.id, to);
    await redisClient.del(`RECOMMENDED_USER_${ctx.user.id}`);
    return true;
  },

  unFollowUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) {
      throw new Error("Unathenticated");
    }
    await UserService.unFollowUser(ctx.user.id, to);
    await redisClient.del(`RECOMMENDED_USER_${ctx.user.id}`);
    return true;
  },
};

export const resolver = { queries, extraResolvers, mutation };
