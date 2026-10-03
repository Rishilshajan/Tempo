"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, PlusCircle, User, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SETTINGS_ITEM } from "@/lib/nav";
import { log } from "@/lib/logger";
import type { Domain } from "@/db/schema";
import type { NavCounts } from "@/server/queries";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { DomainFormSheet } from "@/components/domains/create-domain-sheet";
import { DomainIcon } from "@/components/domains/domain-icon";
import { deleteDomain } from "@/server/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const VIEW_ROUTES = new Set(["/today", "/my-tasks", "/rolled"]);

export function Sidebar({
  domains,
  counts,
}: {
  domains: Domain[];
  counts: NavCounts;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [domainSheetOpen, setDomainSheetOpen] = useState(false);
  const [, startDelete] = useTransition();

  const countFor = (href: string) => {
    switch (href) {
      case "/today":
        return counts.today;
      case "/my-tasks":
        return counts.all;
      case "/rolled":
        return counts.rolled;
      case "/batch-triage":
        return counts.uncategorized;
      default:
        return 0;
    }
  };

  const hrefFor = (href: string) =>
    currentView && VIEW_ROUTES.has(href) ? `${href}?view=${currentView}` : href;

  const domainHref = (id: string) => {
    const params = new URLSearchParams();
    params.set("domain", id);
    if (currentView) params.set("view", currentView);
    return `/my-tasks?${params.toString()}`;
  };

  const removeDomain = (d: Domain) => {
    startDelete(async () => {
      const res = await deleteDomain(d.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Domain deleted - its tasks are now uncategorized");
    });
  };

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex min-h-0 flex-col">
        {/* Brand */}
        <div className="flex h-16 items-center justify-center px-4">
          <Image
            src="/Tempo_Logo_original.png"
            alt="Tempo"
            width={866}
            height={288}
            priority
            className="h-12 w-auto select-none"
          />
        </div>

        {/* Create */}
        <div className="px-4 pb-4 pt-1">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              log.event("Sidebar: Create Task clicked");
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Create Task
          </Button>
        </div>

        {/* General */}
        <div className="px-4 pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            General
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const c = countFor(item.href);
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-[18px]" />
                  {item.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {c}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Domains */}
        <div className="flex items-center justify-between px-4 pb-1 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Domains
          </span>
          <button
            onClick={() => {
              setEditing(null);
              setDomainSheetOpen(true);
            }}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="Add domain"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto px-2">
          {domains.length === 0 ? (
            <button
              onClick={() => {
                setEditing(null);
                setDomainSheetOpen(true);
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <PlusCircle className="size-4" />
              Add Domain
            </button>
          ) : (
            domains.map((d) => (
              <div
                key={d.id}
                className="group flex items-center rounded-xl text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/60"
              >
                <Link
                  href={domainHref(d.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 hover:text-sidebar-foreground"
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded"
                    style={{ backgroundColor: `${d.color}22` }}
                  >
                    <DomainIcon domain={d} className="size-3.5" />
                  </span>
                  <span className="truncate">{d.name}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="mr-1.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[popup-open]:opacity-100"
                    aria-label="Domain options"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => {
                        setEditing(d);
                        setDomainSheetOpen(true);
                      }}
                    >
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-urgent focus:text-urgent"
                      onClick={() => removeDomain(d)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom cluster */}
      <div className="flex flex-col gap-2 p-3">
        <Link
          href={SETTINGS_ITEM.href}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all",
            pathname === SETTINGS_ITEM.href
              ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <SETTINGS_ITEM.icon className="size-[18px]" />
          Settings
        </Link>

        <div className="flex items-center gap-2.5 rounded-xl bg-card p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
            <User className="size-[18px] text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              Rishil Shajan
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Founder Mode
            </span>
          </div>
        </div>
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        domains={domains}
      />
      <DomainFormSheet
        open={domainSheetOpen}
        onOpenChange={setDomainSheetOpen}
        domain={editing}
      />
    </aside>
  );
}
