import Link from "next/link";
import type { Metadata } from "next";

import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Sign up · Tempo" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start orchestrating your day with Tempo.
        </p>
      </header>

      <CredentialsForm mode="signup" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
