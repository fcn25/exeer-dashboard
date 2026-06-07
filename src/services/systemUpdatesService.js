import {
  isSystemUpdateVisible,
  SYSTEM_UPDATES_DISPLAY_FROM,
} from "../../shared/systemUpdatesConfig.js";

const UPDATES_URL = "/system-updates.json";

export async function fetchSystemUpdates() {
  const response = await fetch(UPDATES_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("تعذّر تحميل سجل التحديثات.");
  }

  const payload = await response.json();
  const displayFrom =
    payload?.displayFrom ?? SYSTEM_UPDATES_DISPLAY_FROM;
  const updates = Array.isArray(payload?.updates) ? payload.updates : [];

  return {
    generatedAt: payload?.generatedAt ?? null,
    displayFrom,
    source: payload?.source ?? "git",
    updates: updates
      .filter((item) => item?.title)
      .map((item) => ({
        title: String(item.title).trim(),
        publishedAt: item.publishedAt ?? null,
      }))
      .filter((item) => isSystemUpdateVisible(item.publishedAt, displayFrom)),
  };
}
