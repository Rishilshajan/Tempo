/**
 * TEMPO-002 — Server session check, Clerk form presentation, and alternate auth links.
 * Code map: src/components/code-map.md
 */
import Link from "next/link";
import { Suspense } from "react";
import { AuthTransition } from "./auth-transition";
import { AuthProgress } from "./auth-progress";
import { SignIn, SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth/config";
import { buttonVariants } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/auth/appearance";

// Clerk owns the button markup; share the UI Button variant through its appearance API.
const authButtonClass = buttonVariants({
  size: "auth",
  className: "auth-provider-button",
});

const authAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    // Keep input borders and focus outlines clear of the Clerk card boundary.
    cardBox: { ...clerkAppearance.elements.cardBox, overflow: "visible" },
    card: { ...clerkAppearance.elements.card, padding: "2px" },
    backLink: buttonVariants({
      variant: "secondary",
      size: "auth",
      className: "auth-provider-back",
    }),
    backRow: { width: "100%", display: "flex", justifyContent: "center" },
    header: "auth-provider-header",
    headerTitle: "auth-provider-title",
    headerSubtitle: "auth-provider-subtitle",
    main: "auth-provider-main",
    form: "auth-provider-form",
    identityPreview: "auth-provider-identity",
    identityPreviewText: "auth-provider-identity-text",
    formFieldLabelRow: "auth-provider-label-row",
    formFieldAction: "auth-provider-field-action",
    buttonArrowIcon: { display: "none" },
    formField: "auth-provider-field",
    formField__signOutOfOtherSessions: { display: "none" },
    formFieldRow__signOutOfOtherSessions: { display: "none" },
    formFieldInput: "auth-provider-input",
    formFieldSuccessText__password: { display: "none" },
    formFieldSuccessText__newPassword: { display: "none" },
    formFieldSuccessText__confirmPassword: { display: "none" },
    formButtonPrimary: authButtonClass,
    formButtonReset: authButtonClass,
    alternativeMethodsBlockButton: authButtonClass,
  },
};

/**
 * TEMPO-002-F04 — AuthPanel
 * Purpose: Renders the chosen Clerk form or configuration-unavailable state.
 * Used by: LoginPage and SignupPage.
 * Trigger: Auth route renders; existing sessions redirect to /dashboard.
 */
export async function AuthPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
  const configured = isClerkConfigured();
  if (configured) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }
  const signingIn = mode === "sign-in";
  const loading = (
    <AuthProgress
      message={signingIn ? "Loading sign-in…" : "Loading sign-up…"}
    />
  );

  return (
    <section
      className="auth-card"
      aria-label={signingIn ? "Sign in to Tempo" : "Create a Tempo account"}
    >
      <AuthPanelContent configured={configured}>
        {configured ? (
          <Suspense fallback={loading}>
            {signingIn ? (
              <SignIn
                routing="path"
                path="/login"
                signUpUrl="/signup"
                forceRedirectUrl="/dashboard"
                signUpForceRedirectUrl="/dashboard"
                appearance={authAppearance}
                fallback={loading}
              />
            ) : (
              <SignUp
                routing="path"
                path="/signup"
                signInUrl="/login"
                forceRedirectUrl="/dashboard"
                signInForceRedirectUrl="/dashboard"
                appearance={authAppearance}
                fallback={loading}
              />
            )}
          </Suspense>
        ) : (
          <>
            <h1>
              {signingIn
                ? "Welcome back to Tempo"
                : "Create your Tempo account"}
            </h1>
            <p className="auth-intro">
              {signingIn
                ? "Sign in to your personal command center and manage your work."
                : "One place for your tasks, commitments, and domains."}
            </p>
            <div className="auth-form">
              <div className="auth-unavailable" role="status">
                <strong>
                  {signingIn ? "Sign-in" : "Account creation"} is not available
                  yet.
                </strong>
                <p>
                  Tempo’s authentication is being connected. Please check back
                  shortly.
                </p>
              </div>
            </div>
          </>
        )}
        <p className="auth-account-link">
          {signingIn ? "New to Tempo? " : "Already have an account? "}
          <Link href={signingIn ? "/signup" : "/login"} prefetch={false}>
            {signingIn ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </AuthPanelContent>
    </section>
  );
}

/**
 * TEMPO-002-F11 — AuthPanelContent
 * Purpose: Adds client session transition handling only when Clerk is configured.
 * Used by: AuthPanel.
 * Trigger: Auth panel renders.
 */
function AuthPanelContent({
  configured,
  children,
}: {
  configured: boolean;
  children: React.ReactNode;
}) {
  return configured ? <AuthTransition>{children}</AuthTransition> : children;
}
