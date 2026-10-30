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
      onOpenChange={(open) => {
        if (!open && !inFlightRef.current) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete domain?</DialogTitle>
          <DialogDescription className="break-words">
            Delete “{domain?.name}”? This removes the domain classification and
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-11"
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
