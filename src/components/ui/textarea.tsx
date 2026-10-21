"use client";

import * as React from "react";
import { cn } from "cn";

function resizeTextarea(textarea: HTMLTextAreaElement) {
  if (typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")) {
    return;
  }
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function Textarea({
  className,
  onChange,
  value,
  defaultValue,
  ...props
}: React.ComponentProps<"textarea">) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [value, defaultValue]);

  return (
    <textarea
      ref={textareaRef}
      data-slot="textarea"
      value={value}
      defaultValue={defaultValue}
      onChange={(event) => {
        onChange?.(event);
        resizeTextarea(event.currentTarget);
      }}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
