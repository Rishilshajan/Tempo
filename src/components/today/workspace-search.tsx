"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DomainLabel, type DomainSummary } from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function WorkspaceSearch({ enabled, mobile, onTask, onDomain }: {
  enabled: boolean;
  mobile?: boolean;
  onTask: (id: Id<"tasks">) => void;
  onDomain: (domain: DomainSummary) => void;
}) {
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

  return (
    <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : close()}>
      <DialogTrigger render={<Button
        disabled={!enabled}
        aria-label="Search tasks and domains"
        variant={mobile ? "ghost" : "secondary"}
        size={mobile ? "icon" : "default"}
        className={mobile ? "lg:hidden" : "hidden w-full max-w-sm justify-start text-muted-foreground lg:flex"}
      />}>
        <Search aria-hidden="true" />
        {!mobile && "Search tasks and domains"}
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto">
        <DialogTitle>Search workspace</DialogTitle>
        <DialogDescription>Find tasks by title or domains by name.</DialogDescription>
        <Input type="search" autoFocus aria-label="Search tasks and domains" maxLength={100}
          placeholder="Search tasks and domains" value={input} onChange={(event) => setInput(event.target.value)} />
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
              <Button key={task.id} variant="ghost" className="h-auto min-h-9 w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
                onClick={() => { close(); onTask(task.id); }}>
                {task.title}
              </Button>
            ))}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
