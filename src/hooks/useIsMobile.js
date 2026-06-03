import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 768;

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
