/**
 * TEMPO-003 - Existing create/edit drawer; delegates form state and sections.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
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
 * TEMPO-003-F31 - CreateTaskSheet
 * Purpose: Provides the existing CreateTaskSheet behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function CreateTaskSheet(props: Props) {
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);
  return (
    <Sheet
      open={props.open}
      onOpenChange={(open, details) => {
        if (inFlightRef.current) details.cancel();
        else props.onOpenChange(open);
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
            onClick={() => props.onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetHeader>
        {props.open && (
          <TaskForm
            {...props}
            saving={saving}
            setSaving={setSaving}
            inFlightRef={inFlightRef}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
