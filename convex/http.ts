import { GitHub, generateState } from "arctic";
import { httpRouter } from "convex/server";
import * as cookie from "cookie";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { SESSION_DURATION_MS } from "./auth";
import { convertErrorsToResponse, corsRoutes, getCookies } from "./helpers";

export const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!
);

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
      const sessionId = getCookies(req)[SESSION_COOKIE_NAME];
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
      const sessionId = getCookies(req)[SESSION_COOKIE_NAME];
      await ctx.runMutation(internal.auth.signOut, { sessionId });
      return new Response(null, {
        status: 200,
        headers: sessionCookieHeader(sessionId!, "expired"),
      });
    })
  ),
});

const GITHUB_OATH_STATE_COOKIE_NAME = "githubOAuthState";

httpWithCors.route({
  path: "/auth/github",
  method: "GET",
  credentials: true,
  handler: httpAction(async () => {
    const state = generateState();
    const url = await github.createAuthorizationURL(state, {
      scopes: ["user:email"],
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        "Set-Cookie": cookie.serialize(GITHUB_OATH_STATE_COOKIE_NAME, state, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          path: "/",
          partitioned: true,
          maxAge: 60 * 10, // 10 minutes
        }),
      },
    });
  }),
});

http.route({
  path: "/auth/github/callback",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = getCookies(req)[GITHUB_OATH_STATE_COOKIE_NAME];

    if (code === null || state === null || state !== storedState) {
      console.error("Invalid code or state in GitHub auth callback");
      return Response.redirect(siteAfterLoginUrl());
    }

    try {
      const { accessToken } = await github.validateAuthorizationCode(code);
      const githubUserResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "app",
        },
      });
      const { email } = await githubUserResponse.json();
      const sessionId = await ctx.runMutation(
        internal.auth.githubSignUpOrSignIn,
        { email }
      );
      return new Response(null, {
        status: 302,
        headers: {
          Location: siteAfterLoginUrl(),
          "Cache-Control": "must-revalidate",
          ...sessionCookieHeader(sessionId, "refresh"),
        },
      });
    } catch (error) {
      console.error(error);
      return Response.redirect(siteAfterLoginUrl());
    }
  }),
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
      expires,
    }),
  };
}

function siteAfterLoginUrl() {
  return process.env.SITE_AFTER_LOGIN_URL ?? siteUrl() + "/authenticated";
}

function siteUrl() {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

export default http;
