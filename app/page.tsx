"use client";

import { useAuthClient } from "@/app/AuthProvider";
import { GithubLogo } from "@/components/GithubLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { CONVEX_SERVER_URL } from "@/lib/server";
import { useAction } from "convex/react";
import NextLink from "next/link";
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
  const emailSignUpOrSignIn = useAction(api.auth.emailSignUpOrSignIn);
  const router = useRouter();
  const [step, setStep] = useState<"signIn" | "code">("signIn");
  const { toast } = useToast();

  return (
    <div className="px-28 mt-12 flex flex-col gap-4">
      <h2 className="font-semibold text-2xl tracking-tight">
        Sign in or create an account
      </h2>
      {step === "signIn" ? (
        <>
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
              const formData = new FormData(event.currentTarget);
              emailSignUpOrSignIn({
                email: formData.get("email") as string,
              })
                .then(() => {
                  setStep("code");
                })
                .catch(() => {
                  toast({
                    title: "Could not send code",
                    variant: "destructive",
                  });
                });
            }}
          >
            <label htmlFor="email">Email</label>
            <Input
              name="email"
              id="email"
              className="mb-4"
              autoComplete="email"
            />
            <Button type="submit">Send code</Button>
          </form>
        </>
      ) : (
        <>
          <form
            className="flex flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              fetch(`${CONVEX_SERVER_URL}/auth/verifyCode`, {
                method: "POST",
                body: formData,
                credentials: "include",
              })
                .then((response) => {
                  if (!response.ok) {
                    throw new Error(response.statusText);
                  }
                  void refreshAuth();
                  router.push("/authenticated");
                })
                .catch(() => {
                  toast({
                    title: "Code could not be verified, try again",
                    variant: "destructive",
                  });
                });
            }}
          >
            <label htmlFor="email">Code</label>
            <Input name="code" id="code" className="mb-4" autoComplete="code" />
            <Button type="submit">Continue</Button>
          </form>
          <Button variant="link" onClick={() => setStep("signIn")}>
            Cancel
          </Button>
        </>
      )}

      <Toaster />
    </div>
  );
}
