import { HttpRouter, PublicHttpAction } from "convex/server";
import { ActionCtx, httpAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import * as cookie from "cookie";

export function convertErrorsToResponse(
  errorStatusCode: number,
  action: (ctx: ActionCtx, request: Request) => Promise<Response>
) {
  return async (ctx: ActionCtx, request: Request) => {
    try {
      return await action(ctx, request);
    } catch (error) {
      if (error instanceof ConvexError) {
        return new Response(null, {
          status: errorStatusCode,
          statusText: (error as any).data,
        });
      } else {
        return new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      }
    }
  };
}

export function getCookies(req: Request): Record<string, string | undefined> {
  return cookie.parse(req.headers.get("Cookie") ?? "");
}

export function corsRoutes(http: HttpRouter, origin: () => string) {
  return {
    route({
      path,
      method,
      handler,
      credentials,
    }: {
      path: string;
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      handler: PublicHttpAction;
      credentials: boolean;
    }) {
      if (method !== "GET") {
        http.route({
          path,
          method: "OPTIONS",
          handler: httpAction(async (ctx, req) => {
            const response = await (handler as any)(ctx, req);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", origin());
            headers.set("Access-Control-Allow-Methods", method);
            headers.set("Vary", "Origin");
            if (credentials) {
              headers.set("Access-Control-Allow-Credentials", "true");
            }

            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers,
            });
          }),
        });
      }

      http.route({
        path,
        method,
        handler: httpAction(async (ctx, req) => {
          const response = await (handler as any)(ctx, req);
          const headers = new Headers(response.headers);
          headers.set("Access-Control-Allow-Origin", origin());
          if (credentials) {
            headers.set("Access-Control-Allow-Credentials", "true");
          }

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          });
        }),
      });
    },
  };
}
