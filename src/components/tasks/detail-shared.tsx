"use client";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/components/today/today-dashboard";

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
