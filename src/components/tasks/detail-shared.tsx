"use client";
import { errorMessage } from "@/components/today/today-dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export function detailError(error: unknown) {
  toast.error(
    error instanceof Error && !("data" in error)
      ? error.message
      : errorMessage(error, "Couldn’t save this change. Please try again."),
  );
}
export function detailTime(at: number, timezone: string, includeDate = false) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    ...(includeDate ? ({ month: "short", day: "numeric" } as const) : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}
export function DetailEmpty({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-5 py-8 text-center">
      <span className="text-primary [&_svg]:size-6">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      <div className="max-w-xs text-xs leading-5 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
export function ConfirmDelete({
  title,
  description,
  onClose,
  onDelete,
  confirmLabel = "Delete",
}: {
  title: string;
  description: string;
  onClose: () => void;
  onDelete: () => Promise<unknown>;
  confirmLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open, details) => {
        if (busy) details.cancel();
        else if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDelete();
                onClose();
              } catch (error) {
                detailError(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * TEMPO-003-F40 - DetailRow
 * Purpose: Provides the existing DetailRow behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[100px_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[120px_minmax(0,1fr)]">
      <dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words leading-5 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
