import { MOCK_COMMAND_HISTORY } from "./constants/mockData.js";
import { AGENT_ENTITY_ROW } from "./agentStyles.js";

function flattenReadHistory() {
  const items = [];
  for (const group of MOCK_COMMAND_HISTORY) {
    for (const item of group.items) {
      if (item.kind === "read") {
        items.push(item);
      }
    }
  }
  return items.slice(0, 5);
}

export default function CompactSearchHistory({ onSelect }) {
  const items = flattenReadHistory();
  if (!items.length) return null;

  return (
    <section className="mt-4">
      <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">آخر عمليات البحث</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect?.(item.text)}
              className={AGENT_ENTITY_ROW}
            >
              <span className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-[#0F172A]">
                {item.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
