"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type FirstTimeEmptyStateProps = {
  /** Authoritative totals across the user's data, not just today's tasks. */
  taskCount: number;
  domainCount: number;
  onCreateTask: () => void;
  onCreateDomain: () => void;
};

export function FirstTimeEmptyState({
  taskCount,
  domainCount,
  onCreateTask,
  onCreateDomain,
}: FirstTimeEmptyStateProps) {
  // Loading or missing counts must never look like a first-time account.
  if (taskCount !== 0 || domainCount !== 0) return null;

  return (
    <section
      aria-labelledby="first-time-heading"
      className="flex min-h-[55svh] flex-col items-center justify-center px-4 py-12 text-center"
    >
      <h1
        id="first-time-heading"
        className="text-balance text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        Your day is open and clear
      </h1>
      <p className="mt-3 max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
        Start by creating a task or organizing your work into a domain.
      </p>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Button
          type="button"
          className="min-h-11 min-w-40 gap-2 px-5"
          onClick={onCreateTask}
        >
          <Plus size={16} aria-hidden="true" />
          Create Task
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 min-w-40 gap-2 px-5"
          onClick={onCreateDomain}
        >
          <Plus size={16} aria-hidden="true" />
          Create Domain
        </Button>
      </div>
    </section>
  );
}
