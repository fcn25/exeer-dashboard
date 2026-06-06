import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 768;

/** Synchronous viewport check (use at login redirect to avoid stale hook state). */
export function detectIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
  );

  useEffect(() => {
    const query = `(max-width: ${breakpoint - 1}px)`;
    const mediaQuery = window.matchMedia(query);

    const sync = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, [breakpoint]);

  return isMobile;
}
