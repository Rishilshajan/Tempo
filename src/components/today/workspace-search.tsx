"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DomainLabel, type DomainSummary } from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkspaceSearch({ enabled, mobile, onTask, onDomain }: {
  enabled: boolean;
  mobile?: boolean;
  onTask: (id: Id<"tasks">) => void;
  onDomain: (domain: DomainSummary) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const trimmed = input.trim();
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(trimmed), 200);
    return () => window.clearTimeout(timer);
  }, [trimmed]);
  const results = useQuery(api.tasks.searchWorkspace,
    open && enabled && term && term === trimmed ? { term } : "skip");

  function close() {
    setOpen(false);
    setInput("");
    setTerm("");
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        close();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const searchInput = (
    <Input type="search" aria-label="Search tasks and domains" maxLength={100}
      disabled={!enabled} placeholder="Search tasks and domains" value={input}
      onFocus={() => setOpen(true)}
      onChange={(event) => { setInput(event.target.value); setOpen(true); }}
      className="min-w-0" autoFocus={mobile} />
  );

  return (
    <div ref={container} className={mobile ? "lg:hidden" : "relative hidden w-full max-w-sm lg:block"}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}>
      {mobile ? (
        <Button size="icon" variant="ghost" disabled={!enabled} aria-expanded={open}
          aria-label="Search tasks and domains" onClick={() => open ? close() : setOpen(true)}>
          <Search aria-hidden="true" />
        </Button>
      ) : searchInput}
      {open && (
      <div className={`absolute top-full z-40 mt-2 max-h-[55dvh] space-y-2 overflow-y-auto rounded-xl border border-border bg-popover p-3 text-sm shadow-md ${mobile ? "inset-x-4" : "left-0 w-full"}`}>
        {mobile && <div className="flex items-center gap-2">
          {searchInput}
          <Button size="icon-sm" variant="ghost" aria-label="Close search" onClick={close}><X /></Button>
        </div>}
        {!trimmed && <p className="text-muted-foreground">Find tasks by title or domains by name.</p>}
        {trimmed && !results && <p role="status" className="text-muted-foreground">Searching…</p>}
        {results && !results.tasks.length && !results.domains.length && (
          <p role="status" className="text-muted-foreground">No matching tasks or domains.</p>
        )}
        {results && results.domains.length > 0 && (
          <section aria-label="Matching domains">
            <h3 className="text-xs text-muted-foreground">Domains</h3>
            {results.domains.map(domain => (
              <Button key={domain._id} variant="ghost" className="w-full justify-start"
                onClick={() => { close(); onDomain(domain); }}>
                <DomainLabel {...domain} />
              </Button>
            ))}
          </section>
        )}
        {results && results.tasks.length > 0 && (
          <section aria-label="Matching tasks">
            <h3 className="text-xs text-muted-foreground">Tasks</h3>
            {results.tasks.map(task => (
              <div key={task.id} className="border-b border-border py-1 last:border-0">
                <Button variant="ghost" className="h-auto min-h-9 w-full justify-between gap-2 whitespace-normal text-left"
                  onClick={() => { close(); onTask(task.id); }}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{task.title}</span>
                  {task.date && <time dateTime={task.date} className="shrink-0 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(task.date))}
                  </time>}
                </Button>
                {task.domain && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (task.domain) { close(); onDomain(task.domain); }
                  }}>
                    <DomainLabel {...task.domain} />
                  </Button>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
      )}
    </div>
  );
}
