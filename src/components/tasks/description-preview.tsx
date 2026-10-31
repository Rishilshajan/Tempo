"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Markdown } from "@/components/ui/markdown";

export function DescriptionPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () =>
      setClipped(element.scrollHeight > element.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [expanded, text]);
  return (
    <div className="min-w-0">
      <div
        id={id}
        ref={body}
        className={expanded ? "" : "max-h-[3.75rem] overflow-hidden"}
      >
        <Markdown className="text-xs leading-5 text-muted-foreground">
          {text}
        </Markdown>
      </div>
      {(clipped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-1 min-h-8 text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Read less" : "Read more…"}
        </button>
      )}
    </div>
  );
}
