import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { convertErrorsToResponse, corsRoute, getCookies } from "./helpers";

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

corsRoute(http, {
  path: "/auth/token",
  // TODO: Fix for prod
  origin: "http://localhost:3000",
  method: "GET",
  credentials: true,
  action: convertErrorsToResponse(async (ctx, req) => {
    const sessionId = getCookies(req).get(SESSION_COOKIE_NAME);
    const token = await ctx.runAction(internal.node.generateToken, {
      sessionId,
    });
    return new Response(token, {
      status: 200,
      headers: {
        "Content-Type": "application/text",
        // TODO: Fix for prod
        "Set-Cookie": `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=None; Secure; Partitioned`,
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }),
});

corsRoute(http, {
  path: "/auth/signUp",
  method: "POST",
  // TODO: Fix for prod
  origin: "http://localhost:3000",
  credentials: true,
  action: convertErrorsToResponse(async (ctx, req) => {
    const data = await req.formData();
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const sessionId = await ctx.runMutation(internal.auth.signUp, {
      email,
      password,
    });
    return new Response(null, {
      status: 200,
      headers: {
        "Set-Cookie": `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=None; Secure; Partitioned`,
      },
    });
  }),
});

corsRoute(http, {
  path: "/auth/signIn",
  method: "POST",
  // TODO: Fix for prod
  origin: "http://localhost:3000",
  credentials: true,
  action: convertErrorsToResponse(async (ctx, req) => {
    const data = await req.formData();
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const sessionId = await ctx.runMutation(internal.auth.signIn, {
      email,
      password,
    });
    return new Response(null, {
      status: 200,
      headers: {
        "Set-Cookie": `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=None; Secure; Partitioned`,
      },
    });
  }),
});
corsRoute(http, {
  path: "/auth/signOut",
  // TODO: Fix for prod
  origin: "http://localhost:3000",
  method: "POST",
  credentials: true,
  action: convertErrorsToResponse(async (ctx, req) => {
    const sessionId = getCookies(req).get(SESSION_COOKIE_NAME);
    const expired = new Date(0).toUTCString();
    return new Response(null, {
      status: 200,
      headers: {
        // TODO: Fix for prod
        "Set-Cookie": `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=None; Secure; Partitioned; Expires=${expired}`,
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }),
});

export default http;
