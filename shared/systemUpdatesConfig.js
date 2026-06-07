/**
 * System updates log only shows commits at or after this instant.
 * Update this when resetting the visible changelog window.
 */
export const SYSTEM_UPDATES_DISPLAY_FROM = "2026-06-07T12:25:00.000Z";

export function isSystemUpdateVisible(
  publishedAt,
  displayFrom = SYSTEM_UPDATES_DISPLAY_FROM,
) {
  if (!publishedAt) return false;
  const publishedMs = new Date(publishedAt).getTime();
  const cutoffMs = new Date(displayFrom).getTime();
  if (Number.isNaN(publishedMs) || Number.isNaN(cutoffMs)) return false;
  return publishedMs >= cutoffMs;
}
