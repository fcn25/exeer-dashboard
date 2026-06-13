import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, UserRound } from "lucide-react";
import { submitAgentQueryFallback } from "../../services/agentQueryService.js";
import {
  callQueryRpc,
  callQueryRpcZero,
  fetchEmployeeSummary,
  fetchQueryDigest,
  resolveRpcParams,
  searchEmployees,
} from "../../services/queryPanelService.js";
import AgentPanelShell from "./AgentPanelShell.jsx";
import CompactSearchHistory from "./CompactSearchHistory.jsx";
import QueryDigestGrid from "./QueryDigestGrid.jsx";
import QueryResultView from "./QueryResultView.jsx";
import { AGENT_ENTITY_ROW, AGENT_INPUT } from "./agentStyles.js";
import {
  getMatchingIntents,
  hasStructuredMatches,
  looksLikeWriteCommand,
  matchQueryIntent,
} from "./queryPanelUtils.js";
import { pushRecentSearch } from "./queryRecentSearches.js";

function initialsFromName(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`;
}

export default function QueryPanel({ isOpen, onClose, onOpenExecutor }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [quickResult, setQuickResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState("");
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const trimmed = query.trim();
  const isEmpty = trimmed.length === 0;
  const intents = useMemo(() => getMatchingIntents(trimmed), [trimmed]);
  const isWriteLike = trimmed.length > 0 && looksLikeWriteCommand(trimmed);
  const showFallback =
    trimmed.length > 0 &&
    !hasStructuredMatches(trimmed, employees.length) &&
    !isWriteLike;

  const loadDigest = useCallback(async () => {
    setDigestLoading(true);
    setDigestError("");
    try {
      const data = await fetchQueryDigest();
      setDigest(data);
    } catch (digestErr) {
      setDigestError(
        digestErr instanceof Error ? digestErr.message : "تعذّر تحميل النظرة السريعة.",
      );
    } finally {
      setDigestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResult(null);
      setQuickResult(null);
      setEmployees([]);
      setError("");
      return;
    }
    inputRef.current?.focus();
    loadDigest();
  }, [isOpen, loadDigest]);

  useEffect(() => {
    setResult(null);
    setQuickResult(null);
    setError("");

    if (!isOpen || trimmed.length < 2) {
      setEmployees([]);
      return undefined;
    }

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const searchResult = await searchEmployees(trimmed);
        const candidates = searchResult?.data?.candidates ?? [];
        setEmployees(Array.isArray(candidates) ? candidates : []);
      } catch {
        setEmployees([]);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [trimmed, isOpen]);

  const commitResult = useCallback((nextResult, searchText) => {
    setResult(nextResult);
    setQuickResult(null);
    if (searchText) {
      pushRecentSearch(searchText);
      setRecentRefreshKey((key) => key + 1);
    }
  }, []);

  const runRpcIntent = useCallback(
    async (rpc, params, searchText) => {
      setLoading(true);
      setError("");
      try {
        const resolved = resolveRpcParams(rpc, params);
        const data =
          resolved === null
            ? await callQueryRpcZero(rpc)
            : await callQueryRpc(rpc, resolved);
        commitResult(data, searchText);
      } catch (rpcError) {
        setError(rpcError instanceof Error ? rpcError.message : "تعذّر إكمال الاستعلام.");
      } finally {
        setLoading(false);
      }
    },
    [commitResult],
  );

  const runGeminiFallback = useCallback(
    async (searchText) => {
      setLoading(true);
      setError("");
      try {
        const data = await submitAgentQueryFallback({ query: searchText });
        commitResult({ ...data, gemini: true }, searchText);
      } catch (fallbackError) {
        setError(
          fallbackError instanceof Error ? fallbackError.message : "تعذّر إرسال الطلب.",
        );
      } finally {
        setLoading(false);
      }
    },
    [commitResult],
  );

  const handleSubmit = useCallback(async () => {
    if (!trimmed || loading || isWriteLike) return;

    const intentMatch = matchQueryIntent(trimmed);
    if (intentMatch) {
      await runRpcIntent(
        intentMatch.intent.rpc,
        intentMatch.params,
        trimmed,
      );
      return;
    }

    if (employees.length === 1) {
      setLoading(true);
      setError("");
      try {
        const summary = await fetchEmployeeSummary(employees[0].employee_id);
        commitResult(summary, trimmed);
      } catch (summaryError) {
        setError(summaryError instanceof Error ? summaryError.message : "تعذّر التحميل.");
      } finally {
        setLoading(false);
      }
      return;
    }

    await runGeminiFallback(trimmed);
  }, [
    trimmed,
    loading,
    isWriteLike,
    employees,
    runRpcIntent,
    runGeminiFallback,
    commitResult,
  ]);

  const handleOpenExecutor = (prefill) => {
    onClose();
    onOpenExecutor?.(prefill);
  };

  const handleIntentSelect = async (intent) => {
    const match = matchQueryIntent(intent.label);
    setQuery(intent.label);
    await runRpcIntent(intent.rpc, match?.params ?? {}, intent.label);
  };

  const handleEmployeeSelect = async (employee) => {
    setLoading(true);
    setError("");
    const label = `ملخص ${employee.name}`;
    setQuery(label);
    try {
      const summary = await fetchEmployeeSummary(employee.employee_id);
      commitResult(summary, label);
    } catch (employeeError) {
      setError(employeeError instanceof Error ? employeeError.message : "تعذّر التحميل.");
    } finally {
      setLoading(false);
    }
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
        <form
          className="shrink-0 border-b border-[#E2E8F0] px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
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
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="mb-3 text-xs font-normal text-[#64748B]">جاري المعالجة…</p>
          ) : null}

          {error ? (
            <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-800">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-3">
              <QueryResultView
                result={result}
                onQuickResult={setQuickResult}
              />
              {quickResult ? (
                <QueryResultView result={quickResult} />
              ) : null}
            </div>
          ) : null}

          {!result && isEmpty ? (
            <>
              <QueryDigestGrid
                digest={digest}
                loading={digestLoading}
                error={digestError}
              />
              <CompactSearchHistory
                refreshKey={recentRefreshKey}
                onSelect={setQuery}
              />
            </>
          ) : null}

          {!result && !isEmpty ? (
            <div className="space-y-5">
              {intents.length > 0 ? (
                <section>
                  <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">اقتراحات</h2>
                  <ul className="space-y-2">
                    {intents.map((intent) => (
                      <li key={intent.id}>
                        <button
                          type="button"
                          onClick={() => handleIntentSelect(intent)}
                          className={AGENT_ENTITY_ROW}
                        >
                          <span className="text-sm font-normal text-[#0F172A]">{intent.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {employees.length > 0 ? (
                <section>
                  <h2 className="mb-2 px-1 text-xs font-medium text-[#64748B]">موظفون</h2>
                  <ul className="space-y-2">
                    {employees.map((employee) => (
                      <li key={employee.employee_id}>
                        <button
                          type="button"
                          onClick={() => handleEmployeeSelect(employee)}
                          className={`${AGENT_ENTITY_ROW} flex items-center gap-3`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]">
                            {initialsFromName(employee.name)}
                          </span>
                          <div className="min-w-0 flex-1 text-start">
                            <p className="text-sm font-medium text-[#0F172A]">{employee.name}</p>
                            <p className="mt-0.5 text-xs font-normal text-[#64748B]">
                              {[employee.job_title, employee.department]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <UserRound className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
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
                    onClick={() => runGeminiFallback(trimmed)}
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
          ) : null}
        </div>
      </div>
    </AgentPanelShell>
  );
}
