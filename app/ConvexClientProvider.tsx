"use client";
import { AuthProvider, useAuth } from "@/app/AuthProvider";
import { AfterSSR } from "@/components/helpers/AfterSSR";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AfterSSR>
      <AuthProvider>
        <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithAuth>
      </AuthProvider>
    </AfterSSR>
  );
}
