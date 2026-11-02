"use client";
import { useEffect, useId, useRef } from "react";
import { overlayHistory } from "@/lib/overlay-history";
export function useOverlayBack(
  open: boolean,
  close: () => boolean,
  mobileOnly = false,
) {
  const id = useId();
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (
      !open ||
      (mobileOnly && !window.matchMedia("(max-width: 639px)").matches)
    )
      return;
    return overlayHistory().register(id, () => latest.current());
  }, [id, open, mobileOnly]);
}
