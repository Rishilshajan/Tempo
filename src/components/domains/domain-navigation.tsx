"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DomainLabel, type DomainSummary } from "./domain-appearance";

export function DomainNavigation({
  domains,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  domains: DomainSummary[];
  selectedId?: string;
  onSelect: (domain: DomainSummary) => void;
  onEdit: (domain: DomainSummary) => void;
  onDelete: (domain: DomainSummary) => void;
}) {
  return (
    <ul aria-label="Your domains" className="space-y-1">
      {domains.map((domain) => (
        <li
          key={domain._id}
          className={`flex min-w-0 items-center rounded-lg ${selectedId === domain._id ? "bg-sidebar-accent" : "hover:bg-muted/60"}`}
        >
          <button
            type="button"
            aria-current={selectedId === domain._id ? "page" : undefined}
            onClick={() => onSelect(domain)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary lg:min-h-8 lg:gap-2 lg:text-xs lg:[&_svg]:size-3.5"
          >
            <DomainLabel {...domain} tonedIcon />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 shrink-0 lg:size-7"
                  aria-label={`Options for ${domain.name}`}
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(domain)}>
                <Pencil aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(domain)}
              >
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
