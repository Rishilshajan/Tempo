/**
 * TEMPO-001 — Shared public header, logo, and signup action; also used by TEMPO-002.
 * Code map: src/components/code-map.md
 */
import { TempoLogo } from "@/components/brand/tempo-logo";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./mobile-navigation";

/**
 * TEMPO-001-F02 — Wordmark
 * Purpose: Displays the shared Tempo home link and logo.
 * Used by: SiteHeader and LandingFooter.
 * Trigger: Header/footer renders; activation opens /.
 */
export function Wordmark() {
  return (
    <Link href="/" aria-label="Tempo home" className="landing-wordmark">
      <TempoLogo className="h-auto w-full" />
    </Link>
  );
}

/**
 * TEMPO-001-F03 — SignupLink
 * Purpose: Displays the shared signup call to action.
 * Used by: SiteHeader and HeroSection.
 * Trigger: Activation opens /signup.
 */
export function SignupLink({
  children = "Get started for free",
}: {
  children?: React.ReactNode;
}) {
  return (
    <Link
      href="/signup"
      prefetch={false}
      className={cn(buttonVariants(), "landing-cta")}
    >
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

/**
 * TEMPO-001-F04 — SiteHeader
 * Purpose: Selects landing navigation or the auth back link.
 * Used by: LandingPage and AuthLayout.
 * Trigger: Public route renders; variant selects its controls.
 */
export function SiteHeader({
  variant = "landing",
}: {
  variant?: "landing" | "auth";
}) {
  return (
    <header className="landing-header">
      <div
        className={cn(
          "landing-container landing-header-inner",
          variant === "auth" && "landing-header-inner-auth",
        )}
      >
        <Wordmark />
        {variant === "auth" ? (
          <Link href="/" className="auth-back">
            <ArrowLeft size={14} aria-hidden="true" />
            Back to website
          </Link>
        ) : (
          <>
            <nav aria-label="Main navigation" className="landing-desktop-nav">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
            </nav>
            <div className="landing-header-actions">
              <Link href="/login" prefetch={false} className="landing-login">
                Log in
              </Link>
              <SignupLink>Get started</SignupLink>
            </div>
            <MobileNavigation />
          </>
        )}
      </div>
    </header>
  );
}
