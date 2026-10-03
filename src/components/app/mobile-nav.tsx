"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CircleCheck, History, Settings, Mic } from "lucide-react";

import { cn } from "@/lib/utils";
import { log } from "@/lib/logger";

const LEFT = [
  { label: "Today", href: "/today", icon: Sun },
  { label: "My Tasks", href: "/my-tasks", icon: CircleCheck },
];

const RIGHT = [
  { label: "Rolled", href: "/rolled", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Tab({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: typeof Sun;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-14 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-[22px]" />
      <span className={cn("text-[11px]", active && "font-semibold")}>
        {label}
      </span>
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 z-50 w-full border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {LEFT.map((t) => (
          <Tab key={t.href} {...t} active={pathname === t.href} />
        ))}

        {/* Capture FAB */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={() => log.event("MobileNav: Capture (voice) FAB tapped")}
            aria-label="Capture task by voice"
            className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          >
            <Mic className="size-6" />
          </button>
          <span className="mt-1 text-[11px] text-muted-foreground">Capture</span>
        </div>

        {RIGHT.map((t) => (
          <Tab key={t.href} {...t} active={pathname === t.href} />
        ))}
      </div>
    </nav>
  );
}
