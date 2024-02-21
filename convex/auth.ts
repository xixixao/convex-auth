import { ConvexError, v } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Id } from "./_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  action,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { sendVerificationEmail } from "./auth/VerificationCodeEmail";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const VERIFICATION_CODE_DURATION_MS = 1000 * 60 * 10; // 10 minutes

export const emailSignUpOrSignIn = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const code = await ctx.runMutation(internal.auth.createVerificationCode, {
      email,
    });
    await sendVerificationEmail({ email, code });
  },
});

export const createVerificationCode = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    const userId =
      existingUser?._id ?? (await ctx.db.insert("users", { email }));
    const existingCode = await ctx.db
      .query("verificationCodes")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .unique();
    if (existingCode !== null) {
      await ctx.db.delete(existingCode._id);
    }
    const code = generateRandomString(8, alphabet("0-9"));
    await ctx.db.insert("verificationCodes", {
      userId,
      code,
      expirationTime: Date.now() + VERIFICATION_CODE_DURATION_MS,
    });
    return code;
  },
});

export const verifyCode = internalMutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    const verificationCode = await ctx.db
      .query("verificationCodes")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();
    if (verificationCode === null) {
      throw new ConvexError("Invalid verification code");
    }
    await ctx.db.delete(verificationCode._id);
    if (verificationCode.expirationTime < Date.now()) {
      throw new ConvexError("Expired verification code");
    }
    return await createSession(ctx, verificationCode.userId);
  },
});

export const githubSignUpOrSignIn = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    const userId = user?._id ?? (await ctx.db.insert("users", { email }));
    return await createSession(ctx, userId);
  },
});

export const signOut = internalMutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await getSession(ctx, sessionId);
    if (session !== null) {
      await ctx.db.delete(session._id);
    }
  },
});

export const verifyAndRefreshSession = internalMutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await getSession(ctx, sessionId);
    if (session === null || session.expirationTime < Date.now()) {
      console.error(sessionId, session);
      throw new ConvexError("Invalid session cookie");
    }
    await ctx.db.patch(session._id, {
      expirationTime: Date.now() + SESSION_DURATION_MS,
    });
    return session.userId;
  },
});

async function createSession(ctx: MutationCtx, userId: Id<"users">) {
  return await ctx.db.insert("sessions", {
    expirationTime: Date.now() + SESSION_DURATION_MS,
    userId,
  });
}

async function getSession(ctx: QueryCtx, sessionId: string | undefined) {
  if (sessionId === undefined) {
    return null;
  }
  const validId = ctx.db.normalizeId("sessions", sessionId);
  if (validId === null) {
    return null;
  }
  return await ctx.db.get(validId);
}
