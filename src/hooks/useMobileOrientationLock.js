import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { MOBILE_BREAKPOINT } from "./useIsMobile.js";

/** Smallest screen edge (stable across rotation) — matches tablet breakpoint. */
export function isPhoneSizedDevice(
  smallestEdge = MOBILE_BREAKPOINT,
) {
  if (typeof window === "undefined") return false;
  return Math.min(window.screen.width, window.screen.height) < smallestEdge;
}

export function isMobileExperienceRoute(pathname) {
  if (pathname === "/mobile" || pathname.startsWith("/mobile/")) {
    return true;
  }
  if (pathname === "/employee-portal" && isPhoneSizedDevice()) {
    return true;
  }
  return false;
}

async function setPortraitLock(locked) {
  try {
    if (Capacitor.isNativePlatform()) {
      const { ScreenOrientation } = await import(
        "@capacitor/screen-orientation"
      );
      if (locked) {
        await ScreenOrientation.lock({ orientation: "portrait" });
      } else {
        await ScreenOrientation.unlock();
      }
      return;
    }

    const orientation = window.screen?.orientation;
    if (!orientation?.lock) return;

    if (locked) {
      await orientation.lock("portrait");
    } else if (typeof orientation.unlock === "function") {
      orientation.unlock();
    }
  } catch {
    // Orientation lock is unavailable (desktop browser, older WebViews, etc.)
  }
}

/**
 * Phones: portrait lock on manager/employee mobile routes.
 * Tablets and larger: rotation allowed everywhere.
 */
export function useMobileOrientationLock() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lock =
      isPhoneSizedDevice() && isMobileExperienceRoute(pathname);

    setPortraitLock(lock);

    return () => {
      if (lock) {
        setPortraitLock(false);
      }
    };
  }, [pathname]);
}
