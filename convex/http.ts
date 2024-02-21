import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { SESSION_DURATION_MS } from "./auth";
import { convertErrorsToResponse, corsRoutes, getCookies } from "./helpers";
import * as cookie from "cookie";

const http = httpRouter();

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        issuer: process.env.CONVEX_SITE_URL,
        jwks_uri: process.env.CONVEX_SITE_URL + "/.well-known/jwks.json",
        authorization_endpoint:
          process.env.CONVEX_SITE_URL + "/oauth/authorize",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response(
      JSON.stringify({
        keys: [
          { use: "sig", ...(await ctx.runAction(internal.node.publicJWK)) },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

const SESSION_COOKIE_NAME = "__session";

const httpWithCors = corsRoutes(http, siteUrl);

httpWithCors.route({
  path: "/auth/token",
  method: "GET",
  credentials: true,
  handler: httpAction(
    convertErrorsToResponse(200, async (ctx, req) => {
      const existingSessionId = getCookies(req)[SESSION_COOKIE_NAME];
      const sessionId = await ctx.runMutation(
        internal.auth.getOrRefreshSession,
        { sessionId: existingSessionId }
      );
      const token = await ctx.runAction(internal.node.generateToken, {
        sessionId,
      });
      return new Response(token, {
        status: 200,
        headers: {
          "Content-Type": "application/text",
          ...sessionCookieHeader(sessionId, "refresh"),
        },
      });
    })
  ),
});

function sessionCookieHeader(value: string, expire: "refresh" | "expired") {
  const expires = new Date(
    expire === "refresh" ? Date.now() + SESSION_DURATION_MS : 0
  );
  return {
    "Set-Cookie": cookie.serialize(SESSION_COOKIE_NAME, value, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      partitioned: true,
      expires,
    }),
  };
}

function siteUrl() {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

export default http;
