/**
 * TEMPO-003 - TEMPO-003-F05: error boundary and compatibility exports for existing callers.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Component, type ReactNode } from "react";
import { ConnectedDay } from "./connected-day";
import type { TodayDashboardProps } from "./today-types";
class DayErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        role="alert"
        className="my-8 rounded-xl border border-border bg-card p-6 text-sm"
      >
        <p>We couldn’t load your day. Your tasks are still saved.</p>
        <Button
          className="mt-4 min-h-10"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
/**
 * TEMPO-003-F05 - TodayDashboard
 * Purpose: Wraps ConnectedDay in the existing error boundary and preserves public exports.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TodayDashboard(props: TodayDashboardProps) {
  return (
    <DayErrorBoundary>
      <ConnectedDay {...props} />
    </DayErrorBoundary>
  );
}
export { DayCommandCenter } from "./day-command-center";
export { errorMessage } from "./day-errors";
export { DayNavigation } from "./day-navigation";

export type { TaskPrefill } from "./today-types";
