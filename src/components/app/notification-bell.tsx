"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "@/server/notifications-feed";

const TONE: Record<AppNotification["tone"], string> = {
  urgent: "bg-urgent",
  rolled: "bg-rolledforward",
  info: "bg-primary",
};

export function NotificationBell({ items }: { items: AppNotification[] }) {
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Notifications${count ? ` (${count})` : ""}`}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="w-[calc(100vw-1.5rem)] p-0 sm:w-80"
      >
        <div className="border-b border-border px-3 py-2.5 text-sm font-bold text-foreground">
          Notifications
        </div>
        {count === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                className="flex gap-2.5 border-b border-border/60 px-3 py-2.5 last:border-0 hover:bg-secondary"
              >
                <span
                  className={cn("mt-1 size-2 shrink-0 rounded-full", TONE[n.tone])}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground">
                    {n.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
