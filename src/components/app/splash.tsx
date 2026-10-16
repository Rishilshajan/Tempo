"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { log } from "@/lib/logger";

const SPLASH_MS = 800;

/**
 * Branded cold-start screen. Holds briefly, then routes to `target` - which the
 * server page resolves to /today (signed in) or /login (signed out).
 */
export function Splash({ target }: { target: string }) {
  const router = useRouter();
  const [fill, setFill] = useState(false);

  useEffect(() => {
    log.info(`Cold start splash mounted - holding ${SPLASH_MS}ms -> ${target}`);
    const raf = requestAnimationFrame(() => setFill(true));
    const timer = setTimeout(() => {
      log.success(`Splash complete - redirecting to ${target}`);
      router.replace(target);
    }, SPLASH_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [router, target]);

  return (
    <main className="dot-grid flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <Image
          src="/Tempo_Logo_original.png"
          alt="Tempo"
          width={866}
          height={288}
          priority
          className="h-auto w-56 select-none sm:w-72"
        />
        <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
          Your day, orchestrated
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[3000ms] ease-linear"
            style={{ width: fill ? "100%" : "0%" }}
          />
        </div>
        <p className="animate-pulse text-center text-xs text-muted-foreground">
          Preparing your morning briefing…
        </p>
      </div>
    </main>
  );
}
