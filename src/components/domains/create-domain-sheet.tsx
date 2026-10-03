"use client";

import { useEffect, useState, useTransition } from "react";
import { FolderPlus, Check, Sun, ChevronsDownUp } from "lucide-react";
import { toast } from "sonner";

import type { Domain } from "@/db/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS } from "@/lib/task-ui";
import { GLYPHS, glyphLabel } from "@/lib/glyphs";
import { createDomain, updateDomain } from "@/server/actions";
import { log } from "@/lib/logger";
import { useIsDesktop } from "@/hooks/use-is-desktop";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 15);

const BLANK = {
  name: "",
  tag: "",
  color: DOMAIN_COLORS[0] as string,
  glyph: "rocket",
  purpose: "",
  morningBias: true,
  allowElastic: true,
};

export function DomainFormSheet({
  open,
  onOpenChange,
  domain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain?: Domain | null;
}) {
  const isDesktop = useIsDesktop();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(BLANK);
  const [tagTouched, setTagTouched] = useState(false);
  const editing = !!domain;

  // Hydrate the form from the entity each time the sheet opens. Resetting local
  // state when a prop/open changes is the intended use of this effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (domain) {
        setForm({
          name: domain.name,
          tag: domain.tag,
          color: domain.color,
          glyph: domain.glyph ?? "rocket",
          purpose: domain.purpose ?? "",
          morningBias: domain.morningBias,
          allowElastic: domain.allowElastic,
        });
        setTagTouched(true);
      } else {
        setForm(BLANK);
        setTagTouched(false);
      }
    }
  }, [open, domain]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onName = (name: string) =>
    setForm((f) => ({ ...f, name, tag: tagTouched ? f.tag : slugify(name) }));

  const submit = () => {
    startTransition(async () => {
      const payload = {
        name: form.name,
        tag: form.tag || slugify(form.name),
        color: form.color,
        glyph: form.glyph,
        purpose: form.purpose || null,
        morningBias: form.morningBias,
        allowElastic: form.allowElastic,
      };
      const res = editing
        ? await updateDomain({ id: domain.id, ...payload })
        : await createDomain(payload);
      if (!res.ok) {
        log.error("Domain save failed", res.error);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Domain updated" : "Domain created");
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop ? "w-full sm:max-w-xl" : "max-h-[92vh] rounded-t-2xl",
        )}
      >
        <SheetHeader className="gap-1 border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <FolderPlus className="size-5 text-primary" />
            {editing ? "Edit Domain" : "Create New Domain"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Define an operational domain to anchor tasks, cluster energy
            windows, and calibrate scheduling rules.
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Name + tag */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-name">
                Domain Name <span className="text-urgent">*</span>
              </Label>
              <Input
                id="d-name"
                autoFocus
                placeholder="e.g. Growth & Marketing"
                value={form.name}
                onChange={(e) => onName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-tag">
                Tag Handle <span className="text-urgent">*</span>
              </Label>
              <div className="flex items-center rounded-lg border border-input bg-transparent pl-2.5 focus-within:border-ring">
                <span className="text-sm text-muted-foreground">@</span>
                <input
                  id="d-tag"
                  value={form.tag}
                  maxLength={15}
                  onChange={(e) => {
                    setTagTouched(true);
                    if (e.target.value.length > 15) {
                      toast.error("Tag can be at most 15 characters", {
                        id: "tag-limit",
                      });
                    }
                    setForm({ ...form, tag: slugify(e.target.value) });
                  }}
                  placeholder="growth"
                  className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Visual identity */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Visual Identity
              </span>
              <span className="text-xs text-muted-foreground">
                {glyphLabel(form.glyph)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Domain Palette Accent
              </Label>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="flex size-8 items-center justify-center rounded-full transition-all"
                    style={{ backgroundColor: c }}
                    aria-label={`Colour ${c}`}
                  >
                    {form.color === c && (
                      <Check className="size-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Glyph Token
              </Label>
              <div className="flex flex-wrap gap-2">
                {GLYPHS.map((g) => {
                  const Icon = g.icon;
                  const active = form.glyph === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setForm({ ...form, glyph: g.key })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border transition-all",
                        active
                          ? "border-primary bg-card ring-2 ring-primary/40"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                      aria-label={g.label}
                    >
                      <Icon
                        className="size-4"
                        style={{ color: active ? form.color : undefined }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="d-purpose">Domain Purpose &amp; Scope</Label>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Agent Context
              </span>
            </div>
            <Textarea
              id="d-purpose"
              rows={2}
              placeholder="Primary focus area, deliverables, or team context."
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </div>

          {/* Calibration */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Autonomous Calibration
            </Label>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2.5">
                <Sun className="mt-0.5 size-4 text-medium" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Peak Window Priority
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Prioritize this domain in the peak focus window you set in
                    Settings.
                  </div>
                </div>
              </div>
              <Switch
                checked={form.morningBias}
                onCheckedChange={(v) => setForm({ ...form, morningBias: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2.5">
                <ChevronsDownUp className="mt-0.5 size-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Allow Shrinking
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Let the agent shrink tasks toward their minimum on busy days.
                  </div>
                </div>
              </div>
              <Switch
                checked={form.allowElastic}
                onCheckedChange={(v) => setForm({ ...form, allowElastic: v })}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !form.name.trim()}>
            {editing ? "Save Domain" : "Create Domain"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
