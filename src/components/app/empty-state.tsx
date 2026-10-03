"use client";

import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";

import type { Domain } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { DomainFormSheet } from "@/components/domains/create-domain-sheet";
import { log } from "@/lib/logger";

export function EmptyState({
  domains = [],
  title = "Your day is wide open",
  description = "Tempo manages your list with you. Create your first task or workspace domain to get started.",
}: {
  domains?: Domain[];
  title?: string;
  description?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mb-8 max-w-md text-pretty text-sm text-muted-foreground sm:text-base">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          onClick={() => {
            log.event("EmptyState: Create Task clicked");
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" />
          Create Task
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            log.event("EmptyState: New Workspace Domain clicked");
            setDomainOpen(true);
          }}
        >
          <FolderPlus className="size-4" />
          New Workspace Domain
        </Button>
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        domains={domains}
      />
      <DomainFormSheet open={domainOpen} onOpenChange={setDomainOpen} />
    </div>
  );
}
