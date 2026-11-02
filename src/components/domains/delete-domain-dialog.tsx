"use client";

import { useRef, useState } from "react";
import { ConvexError } from "convex/values";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DomainSummary } from "./domain-appearance";
import { DomainLabel } from "./domain-appearance";

export function DeleteDomainDialog({
  domain,
  onClose,
  onDelete,
}: {
  domain: DomainSummary | null;
  onClose: () => void;
  onDelete: (domain: DomainSummary) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function remove() {
    if (!domain || inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onDelete(domain);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "We couldn't delete this domain. Please try again.",
      );
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!domain}
      onOpenChange={(open, details) => {
        if (inFlightRef.current) details.cancel();
        else if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={false} initialFocus={cancelRef}>
        <DialogHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <Trash2 className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>Delete domain?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Your tasks will be kept and moved to Uncategorized. This domain
            cannot be restored after deletion.
          </DialogDescription>
        </DialogHeader>
        {domain && (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium">
            <DomainLabel {...domain} tonedIcon />
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            ref={cancelRef}
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-11 bg-red-700 text-white hover:bg-red-800 dark:bg-red-700 dark:hover:bg-red-600"
            disabled={saving}
            onClick={remove}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            {saving ? "Deleting…" : "Delete Domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
