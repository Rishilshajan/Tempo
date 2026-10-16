import Link from "next/link";
import type { Metadata } from "next";

import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Log in · Tempo" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Log in to pick up your day where you left off.
        </p>
      </header>

      <CredentialsForm mode="login" />

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
