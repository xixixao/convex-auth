"use client";

import { useAuthClient } from "@/app/AuthProvider";
import { GithubLogo } from "@/components/GithubLogo";
import { Code } from "@/components/typography/code";
import { Link } from "@/components/typography/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { CONVEX_SERVER_URL } from "@/lib/server";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import NextLink from "next/link";
import { useState } from "react";

export default function Home() {
  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <h1 className="text-4xl font-extrabold my-8 text-center">
        Convex + Auth + Next.js
      </h1>
      <Authenticated>
        <SignedIn />
      </Authenticated>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
    </main>
  );
}

function SignedIn() {
  const { viewer, numbers } =
    useQuery(api.myFunctions.listNumbers, { count: 10 }) ?? {};
  const addNumber = useMutation(api.myFunctions.addNumber);

  return (
    <>
      <p className="flex gap-4 items-center justify-between">
        Welcome {viewer}!
        <SignOutButton />
      </p>
      <p>
        Click the button below and open this page in another window - this data
        is persisted in the Convex cloud database!
      </p>
      <p>
        <Button
          onClick={() => {
            void addNumber({ value: Math.floor(Math.random() * 10) });
          }}
        >
          Add a random number
        </Button>
      </p>
      <p>
        Numbers:{" "}
        {numbers?.length === 0
          ? "Click the button!"
          : numbers?.join(", ") ?? "..."}
      </p>
      <p>
        Edit <Code>convex/myFunctions.ts</Code> to change your backend
      </p>
      <p>
        Edit <Code>app/(fullstack)/page.tsx</Code> to change your frontend
      </p>
      <p>
        Check out{" "}
        <Link target="_blank" href="https://docs.convex.dev/home">
          Convex docs
        </Link>
      </p>
      <p>
        To build a full page layout copy one of the included{" "}
        <Link target="_blank" href="/layouts">
          layouts
        </Link>
      </p>
    </>
  );
}

function SignOutButton() {
  const { signOut } = useAuthClient();
  return <Button onClick={() => void signOut()}>Sign out</Button>;
}

function AuthForm() {
  const { refreshAuth } = useAuthClient();
  const [error, setError] = useState(null);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");

  return (
    <div className="px-28 mt-12 flex flex-col gap-4">
      <h2 className="font-semibold text-2xl tracking-tight">
        {flow === "signUp" ? "Sign Up" : "Sign In"}
      </h2>
      <Button variant="outline" type="button" asChild>
        <NextLink href={CONVEX_SERVER_URL + "/auth/github"}>
          <GithubLogo className="mr-2 h-4 w-4" /> GitHub
        </NextLink>
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const formData = new FormData(event.currentTarget);
          fetch(`${CONVEX_SERVER_URL}/auth/${flow}`, {
            method: "POST",
            credentials: "include",
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(response.statusText);
              }
              return refreshAuth();
            })
            .catch((error) => {
              setError(error);
            });
        }}
      >
        <label htmlFor="email">Email</label>
        <Input name="email" id="email" className="mb-4" autoComplete="email" />
        <label htmlFor="password">Password</label>
        <Input
          type="password"
          name="password"
          id="password"
          className="mb-4 "
          autoComplete="current-password"
        />
        <Button type="submit">
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      <Button
        variant="link"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
      >
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </Button>
      <div className="font-medium text-sm text-red-500">
        {error !== null
          ? flow === "signIn"
            ? "Could not sign in, did you mean to sign up?"
            : "Could not sign up, did you mean to sign in?"
          : null}
      </div>
    </div>
  );
}
