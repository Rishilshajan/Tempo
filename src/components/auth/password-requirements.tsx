"use client";

import { Check } from "lucide-react";
import { cn } from "cn";

/** The password policy, mirrored from `passwordSchema` (validation/auth.ts). */
const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "Uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "Number", test: (v) => /[0-9]/.test(v) },
  { label: "Special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH = [
  { label: "Weak", bar: "bg-destructive", text: "text-destructive" },
  { label: "Fair", bar: "bg-medium", text: "text-[#b07d1a]" },
  { label: "Strong", bar: "bg-primary", text: "text-primary" },
] as const;

/**
 * Live password feedback: a segmented strength bar + a checklist that ticks
 * green as each rule is satisfied. Far clearer than a static sentence.
 */
export function PasswordRequirements({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const results = RULES.map((r) => ({ label: r.label, met: r.test(value) }));
  const met = results.filter((r) => r.met).length;
  const touched = value.length > 0;
  const level = met <= 2 ? STRENGTH[0] : met <= 4 ? STRENGTH[1] : STRENGTH[2];

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Segmented strength bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-1.5 flex-1 gap-1">
          {RULES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-full flex-1 rounded-full transition-colors duration-300",
                i < met ? level.bar : "bg-muted",
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "w-10 text-right text-xs font-semibold transition-colors",
            touched ? level.text : "text-transparent",
          )}
        >
          {level.label}
        </span>
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-live="polite">
        {results.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                r.met
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-transparent",
              )}
            >
              {r.met && <Check className="size-2.5" strokeWidth={3.5} />}
            </span>
            <span
              className={cn(
                "transition-colors",
                r.met ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
