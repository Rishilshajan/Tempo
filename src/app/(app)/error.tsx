"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { log } from "@/lib/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("Route error boundary caught", error.message, error.digest);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-urgent/10 text-urgent">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        Something went sideways
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tempo couldn&apos;t load this view. This is usually a momentary
        connection hiccup — try again.
      </p>
      <Button onClick={reset}>
        <RotateCw className="size-4" /> Try again
      </Button>
    </div>
  );
}
