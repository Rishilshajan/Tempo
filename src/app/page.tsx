/**
 * TEMPO-001 — Public landing route and signed-in visitor redirect.
 * Code map: src/components/code-map.md
 */
import { SiteHeader } from "@/components/landing/site-header";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth/config";
import { LandingSessionRedirect } from "@/components/auth/landing-session-redirect";
import type { Metadata } from "next";
import { inter } from "@/lib/fonts";
import {
  HeroSection,
  BenefitsSection,
  HowItWorksSection,
  LandingFooter,
} from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Tempo - Your work, in rhythm.",
  description:
    "Every task, every commitment, every domain. One place to keep it all moving. Meet Tempo, your personal work command center.",
};

export const dynamic = "force-dynamic";

/**
 * TEMPO-001-F01 — LandingPage
 * Purpose: Renders the landing sections and checks the server session.
 * Used by: Next.js / route.
 * Trigger: Visitor opens /; signed-in visitors go to /dashboard.
 */
export default async function LandingPage() {
  const configured = isClerkConfigured();
  if (configured) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }
  return (
    <div className={`tempo-light ${inter.className} landing`}>
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>
      {configured && <LandingSessionRedirect />}
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
      </main>
      <LandingFooter />
    </div>
  );
}
