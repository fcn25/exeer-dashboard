import { loadRecentSearches } from "./queryRecentSearches.js";
import { AGENT_ENTITY_ROW, AGENT_TEXT_MUTED } from "./agentStyles.js";

export default function CompactSearchHistory({ onSelect, refreshKey = 0 }) {
  const items = loadRecentSearches();

  if (!items.length) return null;

  return (
    <section className="mt-6">
      <h2 className={`mb-3 px-1 ${AGENT_TEXT_MUTED}`}>آخر عمليات البحث</h2>
      <ul className="space-y-2">
        {items.map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => onSelect?.(text)}
              className={AGENT_ENTITY_ROW}
            >
              <span className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-[#0F172A] dark:text-[var(--text-primary)]">
                {text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
