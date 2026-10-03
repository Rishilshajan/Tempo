"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";

import type { Domain } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainFormSheet } from "@/components/domains/create-domain-sheet";
import { DomainIcon } from "@/components/domains/domain-icon";
import { deleteDomain } from "@/server/actions";

export function DomainManager({ domains }: { domains: Domain[] }) {
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (d: Domain) => {
    setEditing(d);
    setSheetOpen(true);
  };
  const remove = (d: Domain) => {
    startTransition(async () => {
      const res = await deleteDomain(d.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Domain deleted");
    });
  };

  return (
    <Card className="p-5 shadow-sm ring-border">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
            <Tags className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Categories &amp; Domains
            </h2>
            <p className="text-xs text-muted-foreground">
              Group tasks by startup, personal or financial track.
            </p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> New domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No domains yet. Create your first one to start organising tasks.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
            >
              <span
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${d.color}1f` }}
              >
                <DomainIcon domain={d} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {d.name}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  @{d.tag}
                </div>
              </div>
              <button
                onClick={() => openEdit(d)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Edit domain"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => remove(d)}
                disabled={pending}
                className="rounded-lg p-2 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                aria-label="Delete domain"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <DomainFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        domain={editing}
      />
    </Card>
  );
}
