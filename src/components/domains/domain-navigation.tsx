"use client";

import { DomainLabel, type DomainSummary } from "./domain-appearance";

export function DomainNavigation({
  domains,
  selectedId,
  onSelect,
}: {
  domains: DomainSummary[];
  selectedId?: string;
  onSelect: (domain: DomainSummary) => void;
}) {
  return (
    <ul aria-label="Your domains" className="space-y-0">
      {domains.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">No domains yet. Create one to organize your tasks.</li>}
      {domains.map((domain) => (
        <li
          key={domain._id}
          className={`flex min-w-0 items-center rounded-lg ${selectedId === domain._id ? "bg-sidebar-accent" : "hover:bg-muted/60"}`}
        >
          <button
            title={domain.name}
            type="button"
            aria-current={selectedId === domain._id ? "page" : undefined}
            onClick={() => onSelect(domain)}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary lg:min-h-8 lg:gap-2 lg:text-xs lg:[&_svg]:size-3.5"
          >
            <DomainLabel {...domain} tonedIcon />
          </button>

        </li>
      ))}
    </ul>
  );
}
