"use node";

import { SignJWT, exportJWK, importPKCS8, importSPKI } from "jose";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const publicJWK = internalAction(async () => {
  // This has to be in node because we get "Unrecognized algorithm"
  const publicKey = await importSPKI(process.env.AUTH_PUBLIC_KEY!, "RS256");
  return await exportJWK(publicKey);
});

export const generateToken = internalAction({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId }): Promise<string> => {
    const userId = await ctx.runMutation(
      internal.auth.verifyAndRefreshSession,
      { sessionId }
    );
    const privateKey = await importPKCS8(
      process.env.AUTH_PRIVATE_KEY!,
      "RS256"
    );
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setIssuer(process.env.CONVEX_SITE_URL!)
      .setAudience("convex")
      .setExpirationTime("1h")
      .sign(privateKey);
  },
});
