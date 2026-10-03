"use client";

import { useState, useTransition } from "react";
import { Sunrise, Bell, Clock, X, Play, ChevronsDownUp } from "lucide-react";
import { toast } from "sonner";

import type { AppSettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRODUCTIVITY_WINDOWS } from "@/server/validation";
import { updateAppSettings, runRollforwardNow } from "@/server/actions";
import { log } from "@/lib/logger";

type FocusWindow = (typeof PRODUCTIVITY_WINDOWS)[number];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function Preferences({ settings }: { settings: AppSettings }) {
  const [pending, startTransition] = useTransition();
  const [rolling, startRolling] = useTransition();
  const [focusWindow, setFocusWindow] = useState<FocusWindow>(
    settings.productivityWindow as FocusWindow,
  );
  const [cushion, setCushion] = useState(String(settings.elasticCushionMin));
  const [alertTimes, setAlertTimes] = useState<string[]>(
    settings.alertTimes ?? [],
  );
  const [newHour, setNewHour] = useState("09");
  const [newMinute, setNewMinute] = useState("00");

  const addTime = () => {
    const t = `${newHour}:${newMinute}`;
    if (alertTimes.includes(t)) {
      toast.info("That time is already added");
      return;
    }
    setAlertTimes([...alertTimes, t].sort());
  };

  const save = () => {
    startTransition(async () => {
      const res = await updateAppSettings({
        productivityWindow: focusWindow,
        elasticCushionMin: Number(cushion) || 0,
        alertTimes,
      });
      if (!res.ok) {
        log.error("Save preferences failed", res.error);
        toast.error(res.error);
      } else toast.success("Preferences saved");
    });
  };

  const runRollforward = () => {
    startRolling(async () => {
      const res = await runRollforwardNow();
      if (!res.ok) toast.error(res.error);
      else
        toast.success(
          res.data === 0
            ? "Nothing to roll forward"
            : `Rolled forward ${res.data} task${res.data > 1 ? "s" : ""}`,
        );
    });
  };

  return (
    <Card className="p-5 shadow-sm ring-border">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <Sunrise className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">
            Productivity Calibration
          </h2>
          <p className="text-xs text-muted-foreground">
            Tune your focus window, cushion, and when Tempo nudges you.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Focus window pills */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Primary focus window
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRODUCTIVITY_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setFocusWindow(w)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-all",
                  focusWindow === w
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Elastic cushion */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-start gap-2.5">
            <ChevronsDownUp className="mt-0.5 size-4 text-primary" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                Elastic cushion
              </div>
              <div className="text-xs text-muted-foreground">
                Buffer kept free before critical deadlines.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={240}
              value={cushion}
              onChange={(e) => setCushion(e.target.value)}
              className="h-9 w-20 text-right font-semibold"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>

        {/* Alert times */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Bell className="size-3.5" /> Alert times
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {alertTimes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground"
              >
                <Clock className="size-3.5 text-primary" />
                {t}
                <button
                  onClick={() =>
                    setAlertTimes(alertTimes.filter((x) => x !== t))
                  }
                  className="text-muted-foreground hover:text-urgent"
                  aria-label={`Remove ${t}`}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1.5">
              <Select
                value={newHour}
                onValueChange={(v) => setNewHour(v ?? "09")}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm font-semibold text-muted-foreground">
                :
              </span>
              <Select
                value={newMinute}
                onValueChange={(v) => setNewMinute(v ?? "00")}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={addTime}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={pending}>
          Save preferences
        </Button>

        {/* Rollforward */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Rollforward
            </h3>
            <p className="text-xs text-muted-foreground">
              Runs automatically nightly. Trigger it now to move unfinished past
              tasks to today.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runRollforward}
            disabled={rolling}
          >
            <Play className="size-4" /> Run now
          </Button>
        </div>
      </div>
    </Card>
  );
}
