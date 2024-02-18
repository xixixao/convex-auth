import { ConvexError, v } from "convex/values";
import { MutationCtx, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Scrypt } from "lucia";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const signIn = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (user === null) {
      throw new ConvexError("Email not found");
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new ConvexError("Incorrect password");
    }
    return await createSession(ctx, user._id);
  },
});

export const signUp = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    // TODO: Validate email and password length / character set
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existingUser !== null) {
      throw new ConvexError("User already exists");
    }
    const userId = await ctx.db.insert("users", {
      email,
      passwordHash: await hashPassword(password),
    });
    return await createSession(ctx, userId);
  },
});

export const verifyAndRefreshSession = internalMutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId }) => {
    const validId =
      sessionId !== undefined
        ? ctx.db.normalizeId("sessions", sessionId)
        : null;
    const session = validId !== null ? await ctx.db.get(validId) : null;
    if (
      validId === null ||
      session === null ||
      session.expirationTime < Date.now()
    ) {
      throw new ConvexError("Invalid session cookie");
    }
    await ctx.db.patch(validId, {
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

async function hashPassword(password: string) {
  return await new Scrypt().hash(password);
}

async function verifyPassword(password: string, hash: string) {
  return await new Scrypt().verify(hash, password);
}
