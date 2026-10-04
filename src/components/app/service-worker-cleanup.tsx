"use client";

import { useEffect } from "react";
import { log } from "@/lib/logger";

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const cleanup = async () => {
      try {
        const registrations = (
          await navigator.serviceWorker.getRegistrations()
        ).filter(
          (registration) => registration.scope === `${window.location.origin}/`,
        );
        const shouldReload = registrations.some(
          (registration) => registration.active,
        );
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );

        if ("caches" in window) {
          await caches.delete("tempo-v2");
        }

        if (shouldReload && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      } catch (error) {
        log.error(
          "Service worker cleanup failed",
          error instanceof Error ? error.message : error,
        );
      }
    };

    void cleanup();
  }, []);

  return null;
}