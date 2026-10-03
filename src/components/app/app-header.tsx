"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Mic,
  User,
  List,
  Columns3,
  Calendar as CalendarIcon,
  ChevronLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { log } from "@/lib/logger";
import { NotificationBell } from "@/components/app/notification-bell";
import type { AppNotification } from "@/server/notifications-feed";

const VIEWS = [
  { key: "list", icon: List, label: "List" },
  { key: "board", icon: Columns3, label: "Board" },
  { key: "calendar", icon: CalendarIcon, label: "Calendar" },
] as const;

export function AppHeader({
  today,
  notifications,
}: {
  today: string;
  notifications: AppNotification[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const TASK_ROUTES = ["/today", "/my-tasks", "/rolled", "/calendar"];
  const isTaskRoute = TASK_ROUTES.includes(pathname);
  const defaultView = pathname === "/calendar" ? "calendar" : "list";
  const activeView = searchParams.get("view") ?? defaultView;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl lg:left-64 lg:px-6">
      {/* Left: logo (mobile) / date + agent (desktop) */}
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/Tempo_Logo_original.png"
          alt="Tempo"
          width={866}
          height={288}
          className="h-9 w-auto select-none lg:hidden"
        />
        <div className="hidden items-center gap-1.5 text-muted-foreground lg:flex">
          <CalendarDays className="size-[18px]" />
          <span className="text-sm font-medium text-foreground">
            {today || " "}
          </span>
        </div>
      </div>

      {/* Center: NL quick-add (desktop only) */}
      <div className="mx-2 hidden max-w-xl flex-1 lg:block">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 shadow-sm ring-1 ring-border">
          <ChevronLeft className="size-[18px] text-primary" />
          <input
            type="text"
            placeholder="Add task naturally or press ⌘K…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.trim();
                log.event("Header: NL quick-add submitted", { value });
                if (!value) log.warn("Header quick-add empty - ignored");
              }
            }}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <button
            onClick={() => log.event("Header: mic (voice) clicked")}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <Mic className="size-[18px]" />
          </button>
        </div>
      </div>

      {/* Right: view switcher + actions */}
      <div className="flex items-center gap-2">
        {isTaskRoute && (
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              const active = activeView === v.key;
              return (
                <Link
                  key={v.key}
                  href={`${pathname}?view=${v.key}`}
                  aria-label={v.label}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" />
                </Link>
              );
            })}
          </div>
        )}
        <NotificationBell items={notifications} />
        <div className="flex size-8 items-center justify-center rounded-full bg-primary">
          <User className="size-[18px] text-primary-foreground" />
        </div>
      </div>
    </header>
  );
}
