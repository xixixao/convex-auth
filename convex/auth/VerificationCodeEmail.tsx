import { Container, Heading, Section, Text } from "@react-email/components";
import { ConvexError } from "convex/values";
import * as React from "react";
import { Resend } from "resend";
import { VERIFICATION_CODE_DURATION_MS } from "../auth";

export async function sendVerificationEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  if (process.env.RESEND_API_KEY === undefined) {
    console.error(
      "Set up `RESEND_API_KEY` environment variable to send verification code emails"
    );
    console.log(`Verification code: ${code}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    // TODO: Update with your app name and email
    from: "My App <onboarding@resend.dev>",
    to: [email],
    // TODO: Update with your app name
    subject: `Sign in to My App`,
    text: `Please enter the following code on the sign in page: ${code}`,
  });

  if (error) {
    throw new ConvexError("Could not send verification code email");
  }
}

// TODO: Fix https://discord.com/channels/1022242959736983613/1130704676581539880/threads/1209950758645006386
function VerificationCodeEmail({ code }: { code: string }) {
  return (
    <Container
      style={{
        padding: "20px",
        margin: "0 auto",
      }}
    >
      <Heading
        style={{
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: "15px",
        }}
      >
        {/* TODO: Update with your app name */}
        Sign in to My App
      </Heading>
      <Text style={{ fontSize: "14px" }}>
        Please enter the following code on the sign in page.
      </Text>
      <Section
        style={{
          textAlign: "center",
        }}
      >
        <Text style={{ fontWeight: "bold" }}>Verification code</Text>
        <Text style={{ fontWeight: "bold", fontSize: "36px" }}>{code}</Text>
        <Text>
          (This code is valid for{" "}
          {Math.floor(VERIFICATION_CODE_DURATION_MS / (60 * 1000))} minutes)
        </Text>
      </Section>
    </Container>
  );
}
