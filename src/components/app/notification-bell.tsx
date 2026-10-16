"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "@/server/notifications-feed";
import { markNotificationsRead } from "@/server/actions";

const TONE: Record<AppNotification["tone"], string> = {
  urgent: "bg-urgent",
  rolled: "bg-rolledforward",
  info: "bg-primary",
};

export function NotificationBell({ items }: { items: AppNotification[] }) {
  // The feed already excludes read notifications (persisted per account).
  // `dismissed` is an optimistic layer so clicking/clearing feels instant
  // while the server action + revalidation catches up.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = items.filter((n) => !dismissed.has(n.id));
  const count = visible.length;

  const markRead = (ids: string[]) => {
    if (!ids.length) return;
    setDismissed((prev) => new Set([...prev, ...ids]));
    startTransition(() => {
      void markNotificationsRead(ids);
    });
  };
  const clearAll = () => markRead(visible.map((n) => n.id));

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
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-bold text-foreground">Notifications</span>
          {count > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <CheckCheck className="size-3.5" />
              Clear all
            </button>
          )}
        </div>
        {count === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {visible.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => markRead([n.id])}
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
