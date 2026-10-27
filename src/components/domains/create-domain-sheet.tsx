"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Type, AlignLeft, Palette, Shapes } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS } from "@/lib/task-ui";
import { GLYPHS, glyphLabel } from "@/lib/glyphs";
import { createDomain, updateDomain } from "@/server/actions";
import { log } from "@/lib/logger";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { DomainIcon } from "@/components/domains/domain-icon";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 15);

const BLANK = {
  name: "",
  color: DOMAIN_COLORS[0] as string,
  glyph: "rocket",
  purpose: "",
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
  const editing = !!domain;

  // Hydrate the form from the entity each time the sheet opens. Resetting local
  // state when a prop/open changes is the intended use of this effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (domain) {
        setForm({
          name: domain.name,
          color: domain.color,
          glyph: domain.glyph ?? "rocket",
          purpose: domain.purpose ?? "",
        });
      } else {
        setForm(BLANK);
      }
    }
  }, [open, domain]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tag = slugify(form.name) || "domain";

  const submit = () => {
    startTransition(async () => {
      const payload = {
        name: form.name,
        tag,
        color: form.color,
        glyph: form.glyph,
        purpose: form.purpose || null,
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
          isDesktop
            ? "lg:data-[side=right]:w-[30vw] lg:data-[side=right]:max-w-none"
            : "max-h-[92vh] rounded-t-2xl",
        )}
      >
        {/* Mobile grab handle */}
        {!isDesktop && (
          <div className="flex shrink-0 justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>
        )}

        <SheetHeader className="shrink-0 gap-3 border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Shapes className="size-5 text-primary" />
            {editing ? "Edit Domain" : "Create New Domain"}
          </SheetTitle>
          {/* Live preview */}
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${form.color}1f` }}
            >
              <DomainIcon
                domain={{ color: form.color, glyph: form.glyph }}
                className="size-4"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {form.name.trim() || "Your domain"}
              </span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                @{tag}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {glyphLabel(form.glyph)}
            </span>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Domain Name */}
          <div className="space-y-1.5">
            <Label htmlFor="d-name" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Domain name <span className="text-urgent">*</span>
            </Label>
            <Input
              id="d-name"
              autoFocus
              className="h-11 text-base font-semibold"
              placeholder="e.g. Growth & Marketing"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={60}
            />
          </div>

          {/* Description – tinted card box matching task creation */}
          <div className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.03] p-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Label htmlFor="d-purpose" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <AlignLeft className="size-3.5" /> Description
            </Label>
            <Textarea
              id="d-purpose"
              rows={2}
              placeholder="What does this domain cover?"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              maxLength={1000}
              className="min-h-16 resize-y border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Palette className="size-3.5" /> Color
            </Label>
            <div className="grid grid-cols-8 gap-2">
              {DOMAIN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-all",
                    form.color === c &&
                      "ring-2 ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={form.color === c}
                >
                  {form.color === c && (
                    <Check className="size-3 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Type className="size-3.5" /> Icon
            </Label>
            <div className="grid grid-cols-8 gap-1.5">
              {GLYPHS.map((g) => {
                const Icon = g.icon;
                const active = form.glyph === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setForm({ ...form, glyph: g.key })}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border transition-all",
                      active
                        ? "border-primary bg-card ring-2 ring-primary/40"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                    aria-label={g.label}
                    aria-pressed={active}
                    title={g.label}
                  >
                    <Icon
                      className="size-3.5"
                      style={{ color: active ? form.color : undefined }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t border-border px-4 py-2.5">
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
