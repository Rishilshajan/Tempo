import type { Metadata } from "next";
import { inter } from "@/lib/fonts";
import { LandingHeader, HeroSection, BenefitsSection, HowItWorksSection, FinalCTASection, LandingFooter } from "@/components/landing/landing-page";
import styles from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Tempo — Your work, in rhythm.",
  description: "Every task, every commitment, every domain. One place to keep it all moving. Meet Tempo, your personal work command center.",
};

export default function LandingPage() {
  return (
    <div className={`tempo-light ${inter.className} ${styles.landing}`}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <LandingHeader />
      <main id="main-content">
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
