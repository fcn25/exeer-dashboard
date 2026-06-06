import { Capacitor } from "@capacitor/core";

export function bootstrapNativeAppShell() {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("cap-native");
}
