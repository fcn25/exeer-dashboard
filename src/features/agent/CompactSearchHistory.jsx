import { loadRecentSearches } from "./queryRecentSearches.js";
import { AGENT_ENTITY_ROW } from "./agentStyles.js";

export default function CompactSearchHistory({ onSelect, refreshKey = 0 }) {
  const items = loadRecentSearches();

  if (!items.length) return null;

  return (
    <section className="mt-4">
      <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">آخر عمليات البحث</h2>
      <ul className="space-y-2">
        {items.map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => onSelect?.(text)}
              className={AGENT_ENTITY_ROW}
            >
              <span className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-[#0F172A]">
                {text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
