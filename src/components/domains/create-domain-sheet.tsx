"use client";

import { useRef, useState, type FormEvent } from "react";
import { ConvexError } from "convex/values";
import { BriefcaseBusiness, Check, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DomainBadge,
  domainColors,
  domainIcons,
  type DomainAppearance,
} from "./domain-appearance";
import {
  createDomainSchema,
  domainNameSchema,
  type CreateDomainValues,
} from "@/lib/validation/domain";

export type { CreateDomainValues } from "@/lib/validation/domain";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: CreateDomainValues) => Promise<unknown>;
  canSubmit: boolean;
  initialValues?: DomainAppearance & { purpose?: string };
};

export function CreateDomainSheet({
  open,
  onOpenChange,
  onCreate,
  canSubmit,
  initialValues,
}: Props) {
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!inFlightRef.current) onOpenChange(next);
      }}
    >
      <SheetContent
        showCloseButton={false}
        initialFocus={() => document.getElementById("domain-name")}
        className="!inset-y-auto !top-0 !h-dvh !w-full !max-w-[420px] gap-0 bg-card"
      >
        <SheetHeader className="relative shrink-0 px-6 pb-5 pt-6 pr-16">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
            <BriefcaseBusiness
              className="size-4 text-primary"
              aria-hidden="true"
            />
            {initialValues ? "Edit Domain" : "New Domain"}
          </SheetTitle>
          <SheetDescription className="mt-1.5 text-xs leading-5">
            Define a sphere of responsibility to organize tasks, commitments,
            and focus.
          </SheetDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              initialValues ? "Close Edit Domain" : "Close New Domain"
            }
            disabled={saving}
            className="absolute right-3 top-3 min-h-11 min-w-11"
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetHeader>
        {open && (
          <DomainForm
            canSubmit={canSubmit}
            saving={saving}
            setSaving={setSaving}
            inFlightRef={inFlightRef}
            onCreate={onCreate}
            onClose={() => onOpenChange(false)}
            initialValues={initialValues}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DomainForm({
  canSubmit,
  saving,
  setSaving,
  inFlightRef,
  onCreate,
  onClose,
  initialValues,
}: {
  canSubmit: boolean;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  inFlightRef: React.RefObject<boolean>;
  onCreate: Props["onCreate"];
  onClose: () => void;
  initialValues?: Props["initialValues"];
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [purpose, setPurpose] = useState(initialValues?.purpose ?? "");
  const [color, setColor] = useState<DomainAppearance["color"]>(
    initialValues?.color ?? "green",
  );
  const [icon, setIcon] = useState<DomainAppearance["icon"]>(
    initialValues?.icon ?? "briefcase",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateDomainValues, string>>
  >({});
  const requestId = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || inFlightRef.current) return;
    requestId.current ??= crypto.randomUUID();
    const parsed = createDomainSchema.safeParse({
      name,
      purpose,
      color,
      icon,
      requestId: requestId.current,
    });
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    inFlightRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onCreate(parsed.data);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "We couldn't save your domain. Your changes are still here; please try again.",
      );
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={saving}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
        <div className="space-y-2">
          <label
            htmlFor="domain-name"
            className="flex justify-between text-xs font-medium"
          >
            Domain Name <span className="text-primary">Required</span>
          </label>
          <Input
            id="domain-name"
            name="name"
            required
            maxLength={80}
            placeholder="e.g., Client Ventures"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldErrors((previous) => ({ ...previous, name: undefined }));
            }}
            onBlur={() => {
              const result = domainNameSchema.safeParse(name);
              setFieldErrors((previous) => ({
                ...previous,
                name: result.success
                  ? undefined
                  : result.error.issues[0].message,
              }));
            }}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={
              fieldErrors.name ? "domain-name-error" : undefined
            }
            disabled={saving}
            className="min-h-11 bg-background"
          />
          {fieldErrors.name && (
            <p id="domain-name-error" className="text-xs text-destructive">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="domain-purpose" className="text-xs font-medium">
            Operating Purpose{" "}
            <span className="font-normal text-muted-foreground">
              (Optional)
            </span>
          </label>
          <Textarea
            id="domain-purpose"
            name="purpose"
            maxLength={500}
            placeholder="What does this domain represent?"
            value={purpose}
            onChange={(event) => {
              setPurpose(event.target.value);
              setFieldErrors((previous) => ({
                ...previous,
                purpose: undefined,
              }));
            }}
            aria-invalid={!!fieldErrors.purpose}
            aria-describedby={
              fieldErrors.purpose ? "domain-purpose-error" : undefined
            }
            disabled={saving}
            className="min-h-24 resize-y bg-muted/50"
          />
          {fieldErrors.purpose && (
            <p id="domain-purpose-error" className="text-xs text-destructive">
              {fieldErrors.purpose}
            </p>
          )}
        </div>
        <fieldset disabled={saving}>
          <legend className="mb-2 text-xs font-medium">Domain Color</legend>
          <div className="flex flex-wrap">
            {domainColors.map((option) => (
              <label
                key={option.id}
                className="relative flex size-11 cursor-pointer items-center justify-center"
              >
                <input
                  type="radio"
                  name="domain-color"
                  value={option.id}
                  aria-label={option.label}
                  checked={color === option.id}
                  onChange={() => setColor(option.id)}
                  className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                />
                <span
                  style={{ backgroundColor: option.value }}
                  className="flex size-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary"
                >
                  {color === option.id && (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={saving}>
          <legend className="mb-2 text-xs font-medium">Domain Icon</legend>
          <div className="grid grid-cols-4 gap-2">
            {domainIcons.map(({ id, label, component: Icon }) => (
              <label key={id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="domain-icon"
                  value={id}
                  aria-label={label}
                  checked={icon === id}
                  onChange={() => setIcon(id)}
                  className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                />
                <span className="flex min-h-11 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Live Badge Preview
          </p>
          <div className="flex items-center gap-2">
            <DomainBadge name={name} color={color} icon={icon} />
            <span className="shrink-0 whitespace-nowrap text-[11px] leading-4 text-muted-foreground">
              Shown on cards &amp; task headers
            </span>
          </div>
        </div>
        {!canSubmit && (
          <p role="status" className="text-xs leading-5 text-muted-foreground">
            Waiting for your secure workspace connection. Please sign in again
            if this continues.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          className="min-h-11 px-3"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name.trim() || !canSubmit || saving}
          className="min-h-11 gap-2 px-4"
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {saving
            ? "Saving…"
            : initialValues
              ? "Save Changes"
              : "Create Domain"}
        </Button>
      </footer>
    </form>
  );
}
