"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { log } from "@/lib/logger";

const SPLASH_MS = 800;

export default function ColdStartSplash() {
  const router = useRouter();
  const [fill, setFill] = useState(false);

  useEffect(() => {
    log.info(`Cold start splash mounted - holding ${SPLASH_MS}ms`);
    // kick off the progress animation on next frame
    const raf = requestAnimationFrame(() => setFill(true));
    // every cold start: hold for 3s, then land on the dashboard
    const timer = setTimeout(() => {
      log.success("Splash complete - redirecting to /today");
      router.replace("/today");
    }, SPLASH_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="dot-grid flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Brand mark */}
        <Image
          src="/Tempo_Logo_original.png"
          alt="Tempo"
          width={866}
          height={288}
          priority
          className="h-auto w-56 select-none sm:w-72"
        />

        {/* Tagline */}
        <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
          Your day, orchestrated
        </p>

        {/* Progress */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[3000ms] ease-linear"
            style={{ width: fill ? "100%" : "0%" }}
          />
        </div>

        {/* Status */}
        <p className="animate-pulse text-center text-xs text-muted-foreground">
          Preparing your morning briefing…
        </p>
      </div>
    </main>
  );
}
