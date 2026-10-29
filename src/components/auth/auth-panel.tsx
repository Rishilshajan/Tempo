import Link from "next/link";
import { Suspense } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth/config";
import { clerkAppearance } from "@/lib/auth/appearance";
import { PasswordGuidance } from "./password-guidance";
import styles from "./auth-shell.module.css";

export async function AuthPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
  const configured = isClerkConfigured();
  if (configured) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }
  const signingIn = mode === "sign-in";
  const loading = <p className={styles.loading} role="status">Loading {signingIn ? "sign-in" : "sign-up"}…</p>;

  return (
    <section className={styles.card} aria-label={signingIn ? "Sign in to Tempo" : "Create a Tempo account"}>
      <span className={styles.badge}>Your work, in rhythm.</span>
      {configured ? (
        <Suspense fallback={loading}>
          {signingIn ? (
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/signup"
              forceRedirectUrl="/dashboard"
              signUpForceRedirectUrl="/dashboard"
              appearance={clerkAppearance}
              fallback={loading}
            />
          ) : (
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/login"
              forceRedirectUrl="/dashboard"
              signInForceRedirectUrl="/dashboard"
              appearance={clerkAppearance}
              fallback={loading}
            />
          )}
        </Suspense>
      ) : (
        <>
          <h1>{signingIn ? "Welcome back to Tempo" : "Create your Tempo account"}</h1>
          <p className={styles.intro}>
            {signingIn
              ? "Sign in to your personal command center and manage your work."
              : "One place for your tasks, commitments, and domains."}
          </p>
          <div className={styles.form}>
            <div className={styles.unavailable} role="status">
              <strong>{signingIn ? "Sign-in" : "Account creation"} is not available yet.</strong>
              <p>Tempo’s authentication is being connected. Please check back shortly.</p>
            </div>
          </div>
        </>
      )}
      {!signingIn && <PasswordGuidance />}
      <p className={styles.accountLink}>
        {signingIn ? "New to Tempo? " : "Already have an account? "}
        <Link href={signingIn ? "/signup" : "/login"} prefetch={false}>
          {signingIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </section>
  );
}
