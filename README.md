# Convex + Auth + Next.js + Tailwind + shadcn/ui

This template provides a minimal setup to get Convex working with
[Next.js](https://nextjs.org/). It has authentication built-in.

Start by editing `convex/myFunctions.ts` and interact with your Next.js app.

See Convex docs at https://docs.convex.dev/home

## Variations

There are 4 variations of this template, each on a different branch.

1. Client blocked - this means the client waits for the server before
   subscribing to queries that need `ctx.auth`. Branch:
   **[client-blocked](https://github.com/xixixao/convex-auth/tree/client-blocked)**
   - With GitHub OAuth. Branch:
     **[client-blocked-oauth-github](https://github.com/xixixao/convex-auth/tree/client-blocked-oauth-github)**
2. Routed - this means the client subscribes to queries immediately, based on
   the page route. Branch:
   **[routed](https://github.com/xixixao/convex-auth/tree/routed)**
   - With GitHub OAuth. Branch:
     **[routed-oauth-github](https://github.com/xixixao/convex-auth/tree/routed-oauth-github)**
