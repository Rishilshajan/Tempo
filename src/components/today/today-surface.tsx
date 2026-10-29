"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { CalendarDays, CircleCheck, Grid2X2, History, Plus, Search, Settings2, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TempoSignOutButton } from "@/components/auth/sign-out-button";
import { FirstTimeEmptyState } from "./first-time-empty-state";

const navigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "My Tasks", icon: CircleCheck, current: false },
  { label: "Rolled Forward", icon: History, current: false },
  { label: "Calendar", icon: CalendarDays, current: false },
];

const mobileNavigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "Tasks", icon: CircleCheck, current: false },
  { label: "Rolled Forward", icon: History, current: false },
  { label: "More", icon: Grid2X2, current: false },
];

type TodaySurfaceProps = {
  todayLabel: string;
  taskCount: number;
  domainCount: number;
};

export function TodaySurface({ todayLabel, taskCount, domainCount }: TodaySurfaceProps) {
  function openCreateTask() {
    toast.info("Task creation is coming next.");
  }

  function openCreateDomain() {
    toast.info("Domain creation is coming next.");
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a href="#today-content" className="sr-only z-50 rounded-md bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <aside aria-label="Workspace sidebar" className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link href="/" aria-label="Tempo home" className="mb-9 inline-flex w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <Image src="/Tempo_Logo_original.png" alt="Tempo" width={866} height={288} priority className="h-auto w-44" />
        </Link>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
        <nav aria-label="Workspace navigation" className="space-y-1">
          {navigation.map(({ label, icon: Icon, current }) => current ? (
            <Link key={label} href="/dashboard" aria-current="page" className="flex min-h-11 items-center gap-3 rounded-lg bg-sidebar-primary px-3 text-sm font-medium text-sidebar-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Icon size={18} aria-hidden="true" />{label}
            </Link>
          ) : (
            <button key={label} type="button" disabled aria-label={`${label} (coming next)`} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-muted-foreground opacity-60">
              <Icon size={18} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
        <div className="mt-9 flex items-center justify-between pl-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Domains</h2>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11 text-primary" aria-label="Create domain" onClick={openCreateDomain}>
            <Plus size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-auto space-y-3 border-t border-sidebar-border pt-5">
          <button type="button" disabled aria-label="Settings (coming next)" className="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-muted-foreground opacity-60">
            <Settings2 size={18} aria-hidden="true" />Settings
          </button>
          <div className="px-2"><TempoSignOutButton /></div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="flex min-h-18 items-center justify-between gap-4 border-b border-border bg-card/60 px-5 sm:px-8">
          <Link href="/" aria-label="Tempo home" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:hidden">
            <Image src="/Tempo_Logo_original.png" alt="Tempo" width={866} height={288} className="h-auto w-32" />
          </Link>
          <div className="hidden w-full max-w-sm items-center gap-3 rounded-lg bg-muted/60 px-3 lg:flex">
            <Search size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <input type="search" disabled aria-label="Search tasks and domains (coming next)" placeholder="Search tasks and domains" className="h-10 min-w-0 w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-5">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><CalendarDays size={14} aria-hidden="true" />{todayLabel}</span>
            <Button className="hidden min-h-10 gap-2 px-4 sm:inline-flex" onClick={openCreateTask}><Plus size={15} aria-hidden="true" />Create Task</Button>
            <UserButton />
          </div>
        </header>

        <main id="today-content" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-8 sm:pt-10 lg:pb-10">
          <div className="flex items-center gap-2 px-2 text-xs font-medium text-primary">
            <Sun size={16} aria-hidden="true" /><span>Today</span>
          </div>
          <FirstTimeEmptyState
            taskCount={taskCount}
            domainCount={domainCount}
            onCreateTask={openCreateTask}
            onCreateDomain={openCreateDomain}
          />
        </main>
      </div>

      <nav aria-label="Mobile workspace navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileNavigation.map(({ label, icon: Icon, current }) => current ? (
          <Link key={label} href="/dashboard" aria-current="page" className="flex min-h-17 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary">
            <Icon size={20} aria-hidden="true" />{label}
          </Link>
        ) : (
          <button key={label} type="button" disabled aria-label={`${label} (coming next)`} className="flex min-h-17 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground opacity-60">
            <Icon size={20} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
    </div>
  );
}
