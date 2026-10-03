"use client";

import { useEffect, useState } from "react";

/**
 * True at >= lg (1024px). Defaults to true so the first paint assumes desktop;
 * sheets open on user interaction (post-mount), so the value is correct by then.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
