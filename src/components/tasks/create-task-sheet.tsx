/**
 * TEMPO-005 - Create/edit sheet shell, focus target and saving dismissal guard.
 * Used by: TodaySurface; EditTaskSheet.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ListPlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { TaskForm } from "./task-form";
import type { Props } from "./task-form-types";

/**
 * TEMPO-005-F01 - CreateTaskSheet
 * Purpose: Renders the shared sheet and guards dismissal while saving.
 * Used by: TodaySurface; EditTaskSheet.
 * Trigger: Create task is opened or an edit sheet is mounted.
 */
export function CreateTaskSheet(props: Props) {
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  /**
   * TEMPO-005-F30 - requestOpenChange
   * Purpose: Confirms dirty dismissal; successful saves close directly.
   * Used by: Header X and TaskForm Cancel/save callback.
   * Trigger: A close action or successful submission requests dismissal.
   */
  const requestOpenChange = (open: boolean) => {
    if (!open && dirty && !inFlightRef.current) {
      setConfirmDiscard(true);
      return;
    }
    setDirty(false);
    props.onOpenChange(open);
  };
  return (
    <Sheet
      open={props.open}
      onOpenChange={(open, details) => {
        if (inFlightRef.current) details.cancel();
        else if (!open && dirty) {
          details.cancel();
          setConfirmDiscard(true);
        } else requestOpenChange(open);
      }}
    >
      <SheetContent
        data-task-detail-drawer={props.editingTask ? "" : undefined}
        showCloseButton={false}
        initialFocus={() => document.getElementById("task-title")}
        className={`!inset-y-auto !top-0 !h-dvh !w-full ${props.editingTask ? "!max-w-none !left-0 !right-auto !w-dvw sm:!left-auto sm:!right-0 sm:!w-full sm:!max-w-[540px]" : "!max-w-[460px]"} gap-0 bg-card motion-reduce:transition-none`}
      >
        <SheetHeader className="relative shrink-0 border-b border-border px-5 py-5 pr-14">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
            <ListPlus className="size-5 text-primary" aria-hidden="true" />
            {props.editingTask ? "Edit Task" : "Create New Task"}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs leading-5">
            {props.editingTask
              ? "Update the task’s details, schedule, and subtasks."
              : "Capture the task, then choose how and when to work on it."}
          </SheetDescription>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              props.editingTask ? "Close Edit Task" : "Close Create New Task"
            }
            disabled={saving}
            className="absolute right-3 top-3 size-9"
            onClick={() => requestOpenChange(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetHeader>
        {props.open && (
          <TaskForm
            {...props}
            onOpenChange={requestOpenChange}
            onDirtyChange={setDirty}
            saving={saving}
            setSaving={setSaving}
            inFlightRef={inFlightRef}
          />
        )}
        <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Discard unsaved changes?</DialogTitle>
              <DialogDescription>Your task has not been saved. Keep editing to preserve your changes.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
              <Button variant="destructive" onClick={() => {
                setConfirmDiscard(false);
                setDirty(false);
                props.onOpenChange(false);
              }}>Discard changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
