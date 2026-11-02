"use client";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
// Also cover restored/cached landing pages after signing in in this browser.
export function LandingSessionRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    const check = () => {
      if (isLoaded && isSignedIn) router.replace("/dashboard");
    };
    check();
    window.addEventListener("pageshow", check);
    return () => window.removeEventListener("pageshow", check);
  }, [isLoaded, isSignedIn, router]);
  return null;
}
