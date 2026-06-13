const STORAGE_KEY = "exeer_query_recent_searches";
const MAX_ITEMS = 8;

/**
 * @returns {string[]}
 */
export function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} text
 */
export function pushRecentSearch(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return;

  const current = loadRecentSearches().filter((item) => item !== trimmed);
  const next = [trimmed, ...current].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
