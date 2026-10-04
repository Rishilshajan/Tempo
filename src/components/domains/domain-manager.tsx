"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Tags,
} from "lucide-react";
import { toast } from "sonner";

import type { Domain } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainFormSheet } from "@/components/domains/create-domain-sheet";
import { DomainIcon } from "@/components/domains/domain-icon";
import { deleteDomain, reorderDomains } from "@/server/actions";

export function DomainManager({ domains }: { domains: Domain[] }) {
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderedDomains, setOptimisticDomains] = useOptimistic(
    domains,
    (current, ids: string[]) => {
      const byId = new Map(current.map((domain) => [domain.id, domain]));
      return ids.flatMap((id) => {
        const domain = byId.get(id);
        return domain ? [domain] : [];
      });
    },
  );

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

  const saveOrder = (next: Domain[]) => {
    if (next.every((domain, index) => domain.id === orderedDomains[index]?.id)) {
      return;
    }
    startTransition(async () => {
      setOptimisticDomains(next.map((domain) => domain.id));
      const res = await reorderDomains(next.map((domain) => domain.id));
      if (!res.ok) toast.error(res.error);
      else toast.success("Domain order saved");
    });
  };

  const moveDomain = (sourceId: string, targetId: string) => {
    const from = orderedDomains.findIndex((domain) => domain.id === sourceId);
    const to = orderedDomains.findIndex((domain) => domain.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...orderedDomains];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveOrder(next);
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
              Drag domains to choose their display order.
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
          {orderedDomains.map((d, index) => (
            <div
              key={d.id}
              draggable={!pending}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", d.id);
                setDraggedId(d.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain");
                if (sourceId) moveDomain(sourceId, d.id);
                setDraggedId(null);
              }}
              onDragEnd={() => setDraggedId(null)}
              className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 ${
                draggedId === d.id ? "opacity-50" : ""
              }`}
            >
              <GripVertical
                className="size-4 shrink-0 cursor-grab text-muted-foreground"
                aria-hidden="true"
              />
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
                onClick={() =>
                  moveDomain(d.id, orderedDomains[index - 1]?.id ?? d.id)
                }
                disabled={pending || index === 0}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                aria-label={`Move ${d.name} up`}
                title="Move up"
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                onClick={() =>
                  moveDomain(d.id, orderedDomains[index + 1]?.id ?? d.id)
                }
                disabled={pending || index === orderedDomains.length - 1}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                aria-label={`Move ${d.name} down`}
                title="Move down"
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                onClick={() => openEdit(d)}
                disabled={pending}
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
