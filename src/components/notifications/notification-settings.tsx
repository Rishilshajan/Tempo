"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Clock, ListChecks, Moon, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { PushDelivery } from "./push-delivery";
import { api } from "../../../convex/_generated/api";
import type { FunctionArgs } from "convex/server";

type Preferences = FunctionArgs<typeof api.notifications.savePreferences>["preferences"];

const triggers = [
  ["briefing", "Daily briefing"],
  ["upcoming", "Upcoming fixed tasks"],
  ["deadlines", "Approaching deadlines"],
  ["overdue", "Overdue tasks"],
  ["rollForward", "Roll-forward summary"],
  ["recurring", "Recurring tasks"],
  ["subtasks", "Subtask reminders"],
] as const;

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Card role="region" aria-label={title}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span>{label}</span>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Choices({ label, options, selected, onChange, scroll = false }: {
  label: string;
  options: { value: number; label: string; accessibleLabel?: string }[];
  selected: number[];
  scroll?: boolean;
  onChange: (values: number[]) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="font-medium">{label}</legend>
      <div className={scroll ? "flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [&>button]:shrink-0" : "flex flex-wrap gap-2"}>
        {options.map(({ value, label, accessibleLabel }) => (
          <Button key={value} size="sm" type="button" variant={selected.includes(value) ? "default" : "outline"}
            aria-label={accessibleLabel} aria-pressed={selected.includes(value)}
            onClick={() => onChange(selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value].sort((a, b) => a - b))}>
            {label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

const dayOptions = weekdays.map((name, value) => ({ value, label: name.slice(0, 2), accessibleLabel: name }));
const upcomingOptions = [5, 15, 30, 60].map((value) => ({ value, label: `${value} min` }));
const deadlineOptions = [{ value: 1440, label: "1 day" }, { value: 180, label: "3 hours" }, { value: 60, label: "1 hour" }];

export function NotificationSettings({ onInAppDraftChange }: {
  onInAppDraftChange: (value: boolean | undefined) => void;
}) {
  const saved = useQuery(api.notifications.preferences, {});
  const save = useMutation(api.notifications.savePreferences);
  const [draft, setDraft] = useState<Partial<Preferences>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => () => onInAppDraftChange(undefined), [onInAppDraftChange]);

  if (!saved) return <p role="status" className="text-sm text-muted-foreground">Loading reminder settings…</p>;

  const preferences = { ...saved, ...draft };
  const changed = Object.keys(draft).length > 0;
  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    try {
      await save({ preferences });
      setDraft({});
      onInAppDraftChange(undefined);
      toast.success("Notification settings saved.");
    } catch {
      toast.error("Could not save notification settings. Check your times and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-xl font-semibold">Notifications &amp; Reminders</h2>
        <p className="mt-1 text-muted-foreground">Choose which reminders Tempo sends and when they arrive.</p>
      </div>
      <fieldset disabled={busy} className="w-full min-w-0 space-y-4">
        <Section title="Delivery Channels" icon={Bell}>
          <Toggle label="In-app notifications" checked={preferences.inApp} onChange={(value) => {
            update("inApp", value);
            onInAppDraftChange(value);
          }} />
          <PushDelivery />
        </Section>
        <Section title="Notification Triggers" icon={ListChecks}>
          <div className="divide-y divide-border">
            {triggers.map(([key, label]) => (
              <Toggle key={key} label={label} checked={preferences[key]} onChange={(value) => update(key, value)} />
            ))}
          </div>
        </Section>
        <Section title="Timing & Cadence" icon={Clock}>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
            <Choices label="Upcoming task lead time" options={upcomingOptions} selected={preferences.upcomingMinutes} onChange={(value) => update("upcomingMinutes", value)} />
            <Choices label="Deadline lead time" options={deadlineOptions} selected={preferences.deadlineMinutes} onChange={(value) => update("deadlineMinutes", value)} />
            <div className="space-y-2">
              <p className="font-medium">Daily briefing time</p>
              <TimePicker ariaLabel="Daily briefing time" value={preferences.briefingTime} onChange={(value) => update("briefingTime", value)} />
            </div>
            <Choices label="Briefing days" options={dayOptions} scroll selected={preferences.briefingDays} onChange={(value) => update("briefingDays", value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Reminder time zone · {preferences.timezone}</span>
            <Button size="sm" variant="ghost" type="button" onClick={() => update("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use device time zone</Button>
          </div>
        </Section>
        <Section title="Quiet Hours" icon={Moon}>
          <Toggle label="Enable quiet hours" checked={preferences.quietEnabled} onChange={(value) => update("quietEnabled", value)} />
          {preferences.quietEnabled && (
            <div className="mt-2 min-w-0 space-y-4">
              <div className="grid gap-3 min-[360px]:grid-cols-2">
                <div><p className="mb-1 font-medium">Start time</p><TimePicker ariaLabel="Quiet hours start" value={preferences.quietStart} onChange={(value) => update("quietStart", value)} /></div>
                <div><p className="mb-1 font-medium">End time</p><TimePicker ariaLabel="Quiet hours end" value={preferences.quietEnd} onChange={(value) => update("quietEnd", value)} /></div>
              </div>
              <Choices label="Quiet days" options={dayOptions} scroll selected={preferences.quietDays} onChange={(value) => update("quietDays", value)} />
              <fieldset className="space-y-2">
                <legend className="font-medium">During quiet hours</legend>
                <label className="flex items-center gap-2"><input className="accent-primary" type="radio" name="quiet-policy" checked={preferences.quietPolicy === "inbox"} onChange={() => update("quietPolicy", "inbox")} /> Keep in the inbox only</label>
                <label className="flex items-center gap-2"><input className="accent-primary" type="radio" name="quiet-policy" checked={preferences.quietPolicy === "digest"} onChange={() => update("quietPolicy", "digest")} /> Send a digest after quiet hours</label>
              </fieldset>
            </div>
          )}
        </Section>
        <div className="flex justify-end">
          <Button disabled={!changed || busy} onClick={() => void submit()}>{busy ? "Saving…" : "Save preferences"}</Button>
        </div>
      </fieldset>
    </div>
  );
}
