const UPDATES_URL = "/system-updates.json";

export async function fetchSystemUpdates() {
  const response = await fetch(UPDATES_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("تعذّر تحميل سجل التحديثات.");
  }

  const payload = await response.json();
  const updates = Array.isArray(payload?.updates) ? payload.updates : [];

  return {
    generatedAt: payload?.generatedAt ?? null,
    source: payload?.source ?? "git",
    updates: updates
      .filter((item) => item?.title)
      .map((item) => ({
        title: String(item.title).trim(),
        publishedAt: item.publishedAt ?? null,
      })),
  };
}
