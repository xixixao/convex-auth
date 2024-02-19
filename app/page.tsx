"use client";

import { useAuthClient } from "@/app/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONVEX_SERVER_URL } from "@/lib/server";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <h1 className="text-4xl font-extrabold my-8 text-center">
        Convex + Auth + Next.js
      </h1>
      <AuthForm />
    </main>
  );
}

function AuthForm() {
  const { refreshAuth } = useAuthClient();
  const router = useRouter();
  const [error, setError] = useState(null);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");

  return (
    <div className="flex flex-col items-center px-20 gap-4">
      <form
        className="flex flex-col w-[18rem]"
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
              void refreshAuth();
              router.push("/authenticated");
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
