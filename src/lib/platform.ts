import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

/** Billing UI only on desktop browser (not native, not mobile/tablet web). */
export const canShowBilling = () => {
  if (Capacitor.isNativePlatform()) return false;
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 1024px)").matches;
  return !(coarse || narrow);
};
