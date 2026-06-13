import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import AgentPanelShell from "./AgentPanelShell.jsx";
import CompactSearchHistory from "./CompactSearchHistory.jsx";
import { AGENT_ENTITY_ROW, AGENT_INPUT } from "./agentStyles.js";
import {
  getMatchingEmployees,
  getMatchingSuggestions,
  hasStructuredMatches,
  looksLikeWriteCommand,
} from "./queryPanelUtils.js";

export default function QueryPanel({ isOpen, onClose, onOpenExecutor }) {
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    inputRef.current?.focus();
  }, [isOpen]);

  const trimmed = query.trim();
  const suggestions = useMemo(
    () => getMatchingSuggestions(trimmed, role),
    [trimmed, role],
  );
  const employees = useMemo(() => getMatchingEmployees(trimmed), [trimmed]);
  const isWriteLike = trimmed.length > 0 && looksLikeWriteCommand(trimmed);
  const showFallback =
    trimmed.length > 0 && !hasStructuredMatches(trimmed, role) && !isWriteLike;
  const isEmpty = trimmed.length === 0;

  const handleOpenExecutor = (prefill) => {
    onClose();
    onOpenExecutor?.(prefill);
  };

  return (
    <AgentPanelShell
      isOpen={isOpen}
      onClose={onClose}
      title="استعلام"
      titleIcon={Search}
      ariaLabelledBy="query-panel-title"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="shrink-0 border-b border-[#E2E8F0] px-4 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن موظف، طلب، أو استفسار…"
              className={`${AGENT_INPUT} py-3.5 ps-11 text-base`}
              aria-label="بحث"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isEmpty ? (
            <CompactSearchHistory onSelect={setQuery} />
          ) : (
            <div className="space-y-5">
              {suggestions.length > 0 ? (
                <section>
                  <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">اقتراحات</h2>
                  <ul className="space-y-2">
                    {suggestions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setQuery(item.text)}
                            className={AGENT_ENTITY_ROW}
                          >
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                              <span className="text-sm font-normal text-[#0F172A]">{item.text}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {employees.length > 0 ? (
                <section>
                  <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">موظفون</h2>
                  <ul className="space-y-2">
                    {employees.map((employee) => (
                      <li key={employee.id}>
                        <button
                          type="button"
                          onClick={() => setQuery(`اعرض ملخص ${employee.full_name}`)}
                          className={AGENT_ENTITY_ROW}
                        >
                          <div className="min-w-0 flex-1 text-start">
                            <p className="text-sm font-medium text-[#0F172A]">{employee.full_name}</p>
                            <p className="mt-0.5 text-xs font-normal text-[#64748B]">
                              {[employee.job_title_name, employee.department]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-normal text-[#64748B]">
                            #{employee.id}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {isWriteLike ? (
                <section>
                  <button
                    type="button"
                    onClick={() => handleOpenExecutor(trimmed)}
                    className={`${AGENT_ENTITY_ROW} border-[#0F172A] bg-[#F8FAFC]`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#0F172A]" aria-hidden />
                      <span className="text-sm font-normal text-[#0F172A]">
                        هذا أمر تنفيذ — افتحه في الوكيل الذكي
                      </span>
                    </span>
                  </button>
                </section>
              ) : null}

              {showFallback ? (
                <section>
                  <button
                    type="button"
                    onClick={() => handleOpenExecutor(`اسأل الوكيل الذكي عن ${trimmed}`)}
                    className={AGENT_ENTITY_ROW}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                      <span className="text-sm font-normal text-[#0F172A]">
                        {`اسأل الوكيل الذكي عن «${trimmed}»`}
                      </span>
                    </span>
                  </button>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AgentPanelShell>
  );
}
