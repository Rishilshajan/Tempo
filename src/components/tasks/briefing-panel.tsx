import { Sunrise, TriangleAlert, Flag } from "lucide-react";

import type { Briefing } from "@/server/briefing";

export function BriefingPanel({ briefing }: { briefing: Briefing }) {
  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-brand">
          <Sunrise className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Morning briefing
          </h2>
          <p className="text-xs text-muted-foreground">{briefing.windowLabel}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground">{briefing.summary}</p>

      {briefing.top && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Flag className="size-4" />
          {briefing.top.title}
        </div>
      )}

      {briefing.warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {briefing.warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg bg-urgent/10 px-3 py-2 text-sm text-urgent"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
