import { Capacitor } from "@capacitor/core";
import {
  getAuthenticatedHomePath,
  isNativeMobileAppAllowedRole,
} from "../constants/roles.js";

export const NATIVE_APP_PUBLIC_PATHS = new Set([
  "/login",
  "/update-password",
  "/mobile/access-denied",
]);

export function resolveAuthenticatedHomePath(role, isMobile = false) {
  if (Capacitor.isNativePlatform() && !isNativeMobileAppAllowedRole(role)) {
    return "/mobile/access-denied";
  }
  return getAuthenticatedHomePath(role, isMobile);
}

export function shouldBlockNativeAppAccess(pathname, role) {
  if (!Capacitor.isNativePlatform()) return false;
  if (NATIVE_APP_PUBLIC_PATHS.has(pathname)) return false;
  return !isNativeMobileAppAllowedRole(role);
}
