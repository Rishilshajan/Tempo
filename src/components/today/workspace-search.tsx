/**
 * TEMPO-003 — Existing authenticated workspace search interface.
 * Code map: src/components/code-map.md; dashboard contract: src/components/today/README.md.
 */
"use client";

import {
DomainLabel,
type DomainSummary,
} from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * TEMPO-003-F13 — WorkspaceSearch
 * Purpose: Searches tasks/domains and delegates selected results to the shell.
 * Used by: TodaySurface.
 * Trigger: Search input changes while enabled.
 */
export function WorkspaceSearch({
  enabled,
  mobile,
  onTask,
  onDomain,
}: {
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
  const results = useQuery(
    api.tasks.searchWorkspace,
    open && enabled && term && term === trimmed ? { term } : "skip",
  );

  function close() {
    setOpen(false);
    setInput("");
    setTerm("");
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      ) {
        close();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const searchInput = (
    <Input
      type="search"
      aria-label="Search tasks and domains"
      maxLength={100}
      disabled={!enabled}
      placeholder="Search tasks and domains"
      value={input}
      onFocus={() => setOpen(true)}
      onChange={(event) => {
        setInput(event.target.value);
        setOpen(true);
      }}
      className="min-w-0"
      autoFocus={open}
    />
  );

  return (
    <div
      ref={container}
      data-search-open={open}
      className={
        mobile ? "workspace-search lg:hidden" : "workspace-search relative hidden lg:block"
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      {!open ? (
        <Button
          size="icon"
          variant="ghost"
          disabled={!enabled}
          aria-expanded={open}
          aria-label="Search tasks and domains"
          onClick={() => (open ? close() : setOpen(true))}
        >
          <Search aria-hidden="true" />
        </Button>
      ) : (
        <div className={`workspace-search-field flex items-center gap-2 ${mobile ? "absolute inset-x-0 top-full z-50 border-b border-border bg-card px-4 py-3" : "w-64 xl:w-80"}`}>
          {searchInput}
          <Button size="icon" variant="ghost" aria-label="Close search" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
      {open && trimmed && (
        <div
          className={`absolute z-40 mt-2 max-h-[55dvh] space-y-2 overflow-y-auto rounded-xl border border-border bg-popover p-3 text-sm shadow-md ${mobile ? "inset-x-4 top-[calc(100%+4.5rem)]" : "top-full right-0 w-80"}`}
        >
          {trimmed && !results && (
            <p role="status" className="text-muted-foreground">
              Searching…
            </p>
          )}
          {results && !results.tasks.length && !results.domains.length && (
            <p role="status" className="text-muted-foreground">
              No matching tasks or domains.
            </p>
          )}
          {results && results.domains.length > 0 && (
            <section aria-label="Matching domains">
              <h3 className="text-xs text-muted-foreground">Domains</h3>
              {results.domains.map((domain) => (
                <Button
                  key={domain._id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    close();
                    onDomain(domain);
                  }}
                >
                  <DomainLabel {...domain} />
                </Button>
              ))}
            </section>
          )}
          {results && results.tasks.length > 0 && (
            <section aria-label="Matching tasks">
              <h3 className="text-xs text-muted-foreground">Tasks</h3>
              {results.tasks.map((task) => (
                <div
                  key={task.id}
                  className="border-b border-border py-1 last:border-0"
                >
                  <Button
                    variant="ghost"
                    className="h-auto min-h-9 w-full justify-between gap-2 whitespace-normal text-left"
                    onClick={() => {
                      close();
                      onTask(task.id);
                    }}
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {task.title}
                    </span>
                    {task.date && (
                      <time
                        dateTime={task.date}
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {new Intl.DateTimeFormat("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(task.date))}
                      </time>
                    )}
                  </Button>
                  {task.domain && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (task.domain) {
                          close();
                          onDomain(task.domain);
                        }
                      }}
                    >
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
