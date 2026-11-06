"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { formatMinutes } from "@/lib/today-model";
import { TaskDomainPill } from "@/components/tasks/task-metadata-pills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const notificationTimestamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const samples = [
  ["Daily briefing", "Review the sprint plan · Send the weekly update"],
  ["Upcoming task", "Design review starts in 15 minutes"],
  ["Deadline approaching", "Submit the project report"],
  ["Overdue task", "Review the expense report"],
  ["Tasks rolled forward", "Finish the onboarding checklist"],
  ["Recurring task today", "Weekly planning"],
  ["Subtask due today", "Attach the final screenshots"],
] as const;

export function NotificationInbox({ onOpenTask }: {
  onOpenTask: (id: Id<"tasks">) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [preview] = useState(() =>
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewNotifications") === "1"
  );
  const [open, setOpen] = useState(preview);
  const [sampleItems, setSampleItems] = useState(() => samples.map(([title, body], index) => ({
    _id: title, title, body,
    domain: index === 0 ? undefined : { name: "Project Atlas", color: "teal" as const, icon: "briefcase" as const },
    estimatedMinutes: index === 0 ? undefined : 30,
    read: index >= 3, createdAt: Date.now() - index * 60_000,
  })));
  const [busy, setBusy] = useState(false);
  const preferences = useQuery(api.notifications.preferences, {});
  const inbox = useQuery(api.notifications.inbox, !preview && preferences?.inApp ? {} : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const dismiss = useMutation(api.notifications.dismiss);
  const clearAll = useMutation(api.notifications.clearAll);
  const items = preview ? sampleItems : inbox?.items;
  const unread = preview ? sampleItems.filter((item) => !item.read).length : inbox?.unreadCount ?? 0;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch {
      toast.error("Could not update notifications. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!preview && !preferences?.inApp) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger ref={triggerRef} render={<Button variant="ghost" size="icon" />} aria-label={`Notifications, ${unread} unread`} className="relative">
        <Bell aria-hidden="true" />
        {unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unread > 99 ? "99+" : unread}</span>}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        alignOffset={({ align, positioner }) => {
          const trigger = triggerRef.current;
          if (!trigger || window.matchMedia("(min-width: 1024px)").matches) return 0;

          const bounds = trigger.getBoundingClientRect();
          const center = document.documentElement.clientWidth / 2;
          if (align === "end") return bounds.right - positioner.width / 2 - center;
          if (align === "start") return center - bounds.left - positioner.width / 2;
          return center - (bounds.left + bounds.right) / 2;
        }}
        className="w-[min(23rem,calc(100vw-2rem))] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle>{preview ? "Notifications preview" : "Notifications"}</PopoverTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={busy || !items?.length} onClick={() => preview ? setSampleItems([]) : void run(() => clearAll({}))}>Clear all</Button>
          </div>
        </div>
        {items === undefined ? <p role="status" className="p-4 text-muted-foreground">Loading notifications…</p> :
          items.length === 0 ? <p className="p-4 text-muted-foreground">You’re all caught up.</p> :
          <ul className="max-h-[min(55dvh,24rem)] space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item._id} className="flex items-start rounded-lg">
                <button type="button" disabled={busy} className="min-w-0 flex-1 space-y-1 rounded-lg p-2 text-left hover:bg-muted/60" onClick={() => {
                  if (preview) {
                    setSampleItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, read: true } : entry));
                    return;
                  }
                  const liveItem = inbox?.items.find((entry) => entry._id === item._id);
                  if (!liveItem) return;
                  if (liveItem.taskId) {
                    setOpen(false);
                    onOpenTask(liveItem.taskId);
                  }
                  if (!item.read) void run(() => markRead({ id: liveItem._id }));
                }}>
                  <Badge variant={item.read ? "secondary" : "default"}>{item.title}</Badge>
                  <span className="block break-words text-sm font-medium">{item.body}</span>
                  {(item.domain || item.estimatedMinutes !== undefined) && (
                    <span className="flex flex-wrap items-center gap-1 text-xs">
                      {item.domain && <TaskDomainPill task={{ domain: item.domain }} />}
                      {item.estimatedMinutes !== undefined && (
                        <Badge variant="secondary">{formatMinutes(item.estimatedMinutes)}</Badge>
                      )}
                    </span>
                  )}
                  <time className="block text-xs text-muted-foreground" dateTime={new Date(item.createdAt).toISOString()}>{notificationTimestamp.format(item.createdAt)}</time>
                </button>
                <Button variant="ghost" size="icon-sm" aria-label={`Dismiss ${item.title}`} disabled={busy} onClick={() => {
                  if (preview) {
                    setSampleItems((current) => current.filter((entry) => entry._id !== item._id));
                    return;
                  }
                  const liveItem = inbox?.items.find((entry) => entry._id === item._id);
                  if (liveItem) void run(() => dismiss({ id: liveItem._id }));
                }}><X /></Button>
              </li>
            ))}
          </ul>}
      </PopoverContent>
    </Popover>
  );
}
