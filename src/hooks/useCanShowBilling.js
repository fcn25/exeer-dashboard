import { useEffect, useState } from "react";
import { canShowBilling } from "../lib/platform.ts";

/** Reactive wrapper — re-evaluates on viewport / pointer changes. */
export function useCanShowBilling() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(canShowBilling());
    sync();

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const narrowQuery = window.matchMedia("(max-width: 1024px)");
    coarseQuery.addEventListener("change", sync);
    narrowQuery.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    return () => {
      coarseQuery.removeEventListener("change", sync);
      narrowQuery.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return allowed;
}
