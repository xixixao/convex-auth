import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { SESSION_DURATION_MS } from "./auth";
import { convertErrorsToResponse, corsRoutes, getCookies } from "./helpers";

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

const httpWithCors = corsRoutes(
  http,
  process.env.SITE_URL ?? "http://localhost:3000"
);

httpWithCors.route({
  path: "/auth/token",
  method: "GET",
  credentials: true,
  handler: httpAction(
    convertErrorsToResponse(200, async (ctx, req) => {
      const sessionId = getCookies(req).get(SESSION_COOKIE_NAME);
      const token = await ctx.runAction(internal.node.generateToken, {
        sessionId,
      });
      return new Response(token, {
        status: 200,
        headers: {
          "Content-Type": "application/text",
          ...sessionCookieHeader(sessionId!, "refresh"),
        },
      });
    })
  ),
});

httpWithCors.route({
  path: "/auth/signUp",
  method: "POST",
  credentials: true,
  handler: httpAction(
    convertErrorsToResponse(401, async (ctx, req) => {
      const data = await req.formData();
      const email = data.get("email") as string;
      const password = data.get("password") as string;
      const sessionId = await ctx.runMutation(internal.auth.signUp, {
        email,
        password,
      });
      return new Response(null, {
        status: 200,
        headers: sessionCookieHeader(sessionId, "refresh"),
      });
    })
  ),
});

httpWithCors.route({
  path: "/auth/signIn",
  method: "POST",
  credentials: true,
  handler: httpAction(
    convertErrorsToResponse(401, async (ctx, req) => {
      const data = await req.formData();
      const email = data.get("email") as string;
      const password = data.get("password") as string;
      const sessionId = await ctx.runMutation(internal.auth.signIn, {
        email,
        password,
      });
      return new Response(null, {
        status: 200,
        headers: sessionCookieHeader(sessionId, "refresh"),
      });
    })
  ),
});

httpWithCors.route({
  path: "/auth/signOut",
  method: "POST",
  credentials: true,
  handler: httpAction(
    convertErrorsToResponse(401, async (ctx, req) => {
      const sessionId = getCookies(req).get(SESSION_COOKIE_NAME);
      await ctx.runMutation(internal.auth.signOut, { sessionId });
      return new Response(null, {
        status: 200,
        headers: sessionCookieHeader(sessionId!, "expired"),
      });
    })
  ),
});

function sessionCookieHeader(value: string, expire: "refresh" | "expired") {
  const expires = (
    expire === "refresh"
      ? new Date(Date.now() + SESSION_DURATION_MS)
      : new Date(0)
  ).toUTCString();
  return {
    "Set-Cookie": `${SESSION_COOKIE_NAME}=${value}; HttpOnly; SameSite=None; Secure; Path=/; Partitioned; Expires=${expires}`,
  };
}

export default http;
