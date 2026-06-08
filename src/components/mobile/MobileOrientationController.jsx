import { useMobileOrientationLock } from "../../hooks/useMobileOrientationLock.js";

/** Applies phone-only portrait lock on mobile manager/employee routes. */
export default function MobileOrientationController() {
  useMobileOrientationLock();
  return null;
}
