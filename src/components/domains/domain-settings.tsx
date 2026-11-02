"use client";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DomainLabel, type DomainSummary } from "./domain-appearance";
import type { Id } from "../../../convex/_generated/dataModel";

type Props = {
  domains: DomainSummary[] | undefined;
  loading: boolean;
  onReorder?: (ids: Id<"domains">[]) => Promise<void>;
  onCreate: () => void;
  onEdit: (domain: DomainSummary) => void;
  onDelete: (domain: DomainSummary) => void;
};
function DomainRow({
  domain,
  disabled,
  onEdit,
  onDelete,
}: {
  domain: DomainSummary;
  disabled: boolean;
  onEdit: Props["onEdit"];
  onDelete: Props["onDelete"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain._id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        "relative flex items-center gap-2 border-b border-border bg-card p-3 last:border-0 sm:gap-3 " +
        (isDragging ? "z-10 shadow-lg" : "")
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={"Reorder " + domain.name}
        className="flex size-10 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
      >
        <GripVertical size={17} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <DomainLabel {...domain} tonedIcon />
        </div>
        {domain.purpose && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {domain.purpose}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={"Edit " + domain.name}
        onClick={() => onEdit(domain)}
        disabled={disabled}
      >
        <Pencil size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={"Delete " + domain.name}
        className="text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        onClick={() => onDelete(domain)}
        disabled={disabled}
      >
        <Trash2 size={15} />
      </Button>
    </li>
  );
}
export function DomainSettings({
  domains,
  loading,
  onReorder,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  const [pending, setPending] = useState<DomainSummary[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const rows = pending ?? domains ?? [];
  const busy = pending !== null;
  async function move({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || busy || loading || !onReorder) return;
    const from = rows.findIndex((d) => d._id === active.id),
      to = rows.findIndex((d) => d._id === over.id);
    if (from < 0 || to < 0) return;
    const ordered = arrayMove(rows, from, to);
    setPending(ordered);
    try {
      await onReorder(ordered.map((d) => d._id));
    } catch {
      toast.error("Couldn't save the domain order. Please try again.");
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your domains across Tempo.
        </p>
      </header>
      <section
        aria-labelledby="domain-settings-heading"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div>
            <h2
              id="domain-settings-heading"
              className="flex items-center gap-2 text-base font-semibold"
            >
              <Layers className="size-4 text-primary" />
              Domains{" "}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                {rows.length}
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag to reorder. Changes save automatically everywhere.
            </p>
          </div>
          <Button onClick={onCreate} className="gap-2">
            <Plus size={16} />
            Create Domain
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span>
            Used in your sidebar, mobile navigation, and domain menus.
          </span>
          <span
            role="status"
            className="inline-flex shrink-0 items-center gap-1 text-primary"
          >
            {busy ? (
              "Saving…"
            ) : (
              <>
                <Check size={14} />
                Saved
              </>
            )}
          </span>
        </div>
        {!domains || loading ? (
          <p
            role="status"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            Loading domains…
          </p>
        ) : rows.length ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={move}
          >
            <SortableContext
              items={rows.map((d) => d._id)}
              strategy={verticalListSortingStrategy}
            >
              <ul aria-label="Domain order">
                {rows.map((domain) => (
                  <DomainRow
                    key={domain._id}
                    domain={domain}
                    disabled={busy || !onReorder}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2 p-10 text-center">
            <Layers className="mx-auto size-7 text-primary" />
            <h3 className="text-sm font-medium">No domains yet</h3>
            <p className="text-xs text-muted-foreground">
              Create a domain to organize your tasks.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
