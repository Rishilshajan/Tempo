import { createElement } from "react";

import type { Domain } from "@/db/schema";
import { glyphIcon } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

/** Renders a domain's Lucide glyph tinted with its colour. */
export function DomainIcon({
  domain,
  className,
}: {
  domain: Pick<Domain, "glyph" | "color">;
  className?: string;
}) {
  // glyphIcon returns a stable, module-level Lucide component from a lookup;
  // createElement keeps it out of the "component created during render" path.
  return createElement(glyphIcon(domain.glyph), {
    className: cn("size-4", className),
    style: { color: domain.color },
  });
}
