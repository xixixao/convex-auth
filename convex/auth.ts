import { v } from "convex/values";
import { MutationCtx, QueryCtx, internalMutation } from "./_generated/server";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const getOrRefreshSession = internalMutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await getSession(ctx, sessionId);
    if (session === null || session.expirationTime < Date.now()) {
      return createSession(ctx);
    }
    await ctx.db.patch(session._id, {
      expirationTime: Date.now() + SESSION_DURATION_MS,
    });
    return session._id;
  },
});

async function createSession(ctx: MutationCtx) {
  return await ctx.db.insert("sessions", {
    expirationTime: Date.now() + SESSION_DURATION_MS,
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
