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
import {
  AGENT_CANVAS,
  AGENT_ENTITY_ROW,
  AGENT_INPUT,
  AGENT_PRIMARY_BTN,
  AGENT_TEXT_MUTED,
} from "./agentStyles.js";
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
  const searchGenerationRef = useRef(0);

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
      setLoading(false);
      searchGenerationRef.current += 1;
      return;
    }
    setLoading(false);
    inputRef.current?.focus();
    loadDigest();
  }, [isOpen, loadDigest]);

  const clearSearchOutput = useCallback(() => {
    setResult(null);
    setQuickResult(null);
    setError("");
  }, []);

  const handleQueryChange = useCallback(
    (nextValue) => {
      searchGenerationRef.current += 1;
      setLoading(false);
      setQuery(nextValue);
      clearSearchOutput();
    },
    [clearSearchOutput],
  );

  useEffect(() => {
    clearSearchOutput();

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
  }, [trimmed, isOpen, clearSearchOutput]);

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
      const generation = searchGenerationRef.current;
      setLoading(true);
      setError("");
      setResult(null);
      setQuickResult(null);
      try {
        const resolved = resolveRpcParams(rpc, params);
        const data =
          resolved === null
            ? await callQueryRpcZero(rpc)
            : await callQueryRpc(rpc, resolved);
        if (generation !== searchGenerationRef.current) return;
        commitResult(data, searchText);
      } catch (rpcError) {
        if (generation !== searchGenerationRef.current) return;
        setError(rpcError instanceof Error ? rpcError.message : "تعذّر إكمال الاستعلام.");
      } finally {
        if (generation === searchGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [commitResult],
  );

  const runGeminiFallback = useCallback(
    async (searchText) => {
      const generation = searchGenerationRef.current;
      setLoading(true);
      setError("");
      setResult(null);
      setQuickResult(null);
      try {
        const data = await submitAgentQueryFallback({ query: searchText });
        if (generation !== searchGenerationRef.current) return;
        commitResult({ ...data, gemini: true }, searchText);
      } catch (fallbackError) {
        if (generation !== searchGenerationRef.current) return;
        setError(
          fallbackError instanceof Error ? fallbackError.message : "تعذّر إرسال الطلب.",
        );
      } finally {
        if (generation === searchGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [commitResult],
  );

  const handleSubmit = useCallback(async () => {
    if (!trimmed || isWriteLike) return;

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
      const generation = searchGenerationRef.current;
      setLoading(true);
      setError("");
      setResult(null);
      setQuickResult(null);
      try {
        const summary = await fetchEmployeeSummary(employees[0].employee_id);
        if (generation !== searchGenerationRef.current) return;
        commitResult(summary, trimmed);
      } catch (summaryError) {
        if (generation !== searchGenerationRef.current) return;
        setError(summaryError instanceof Error ? summaryError.message : "تعذّر التحميل.");
      } finally {
        if (generation === searchGenerationRef.current) {
          setLoading(false);
        }
      }
      return;
    }

    await runGeminiFallback(trimmed);
  }, [
    trimmed,
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
    const generation = searchGenerationRef.current;
    setLoading(true);
    setError("");
    setResult(null);
    setQuickResult(null);
    const label = `ملخص ${employee.name}`;
    setQuery(label);
    try {
      const summary = await fetchEmployeeSummary(employee.employee_id);
      if (generation !== searchGenerationRef.current) return;
      commitResult(summary, label);
    } catch (employeeError) {
      if (generation !== searchGenerationRef.current) return;
      setError(employeeError instanceof Error ? employeeError.message : "تعذّر التحميل.");
    } finally {
      if (generation === searchGenerationRef.current) {
        setLoading(false);
      }
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
      <div className={`flex min-h-0 flex-1 flex-col ${AGENT_CANVAS}`}>
        <form
          className={`shrink-0 border-b border-[#E2E8F0] px-4 py-4 dark:border-[var(--border-color)] ${AGENT_CANVAS}`}
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex items-stretch gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B] dark:text-[var(--text-secondary)]"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="ابحث عن موظف، طلب، أو استفسار…"
                className={`${AGENT_INPUT} py-3.5 pe-11 ps-4 text-base`}
                aria-label="بحث"
              />
            </div>
            <button
              type="submit"
              disabled={!trimmed || loading || isWriteLike}
              className={`${AGENT_PRIMARY_BTN} shrink-0 px-5 py-3.5`}
            >
              بحث
            </button>
          </div>
        </form>

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-5 ${AGENT_CANVAS}`}>
          {loading ? (
            <p className={`mb-3 ${AGENT_TEXT_MUTED}`}>جاري المعالجة…</p>
          ) : null}

          {error ? (
            <p className="mb-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-800 dark:border-[var(--color-error-text)]/30 dark:bg-[var(--color-error-surface)] dark:text-[var(--color-error-text)]">
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
                onSelect={handleQueryChange}
              />
            </>
          ) : null}

          {!result && !isEmpty ? (
            <div className="space-y-5">
              {intents.length > 0 ? (
                <section>
                  <h2 className={`mb-2 px-1 ${AGENT_TEXT_MUTED}`}>اقتراحات</h2>
                  <ul className="space-y-2">
                    {intents.map((intent) => (
                      <li key={intent.id}>
                        <button
                          type="button"
                          onClick={() => handleIntentSelect(intent)}
                          className={AGENT_ENTITY_ROW}
                        >
                          <span className="text-sm font-normal text-[#0F172A] dark:text-[var(--text-primary)]">{intent.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {employees.length > 0 ? (
                <section>
                  <h2 className={`mb-2 px-1 ${AGENT_TEXT_MUTED}`}>موظفون</h2>
                  <ul className="space-y-2">
                    {employees.map((employee) => (
                      <li key={employee.employee_id}>
                        <button
                          type="button"
                          onClick={() => handleEmployeeSelect(employee)}
                          className={`${AGENT_ENTITY_ROW} flex items-center gap-3`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]">
                            {initialsFromName(employee.name)}
                          </span>
                          <div className="min-w-0 flex-1 text-start">
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">{employee.name}</p>
                            <p className={`mt-0.5 ${AGENT_TEXT_MUTED}`}>
                              {[employee.job_title, employee.department]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <UserRound className="h-4 w-4 shrink-0 text-[#64748B] dark:text-[var(--text-secondary)]" aria-hidden />
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
                    className={`${AGENT_ENTITY_ROW} border-[#0F172A] bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#0F172A] dark:text-[var(--text-primary)]" aria-hidden />
                      <span className="text-sm font-normal text-[#0F172A] dark:text-[var(--text-primary)]">
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
                      <Sparkles className="h-4 w-4 shrink-0 text-[#64748B] dark:text-[var(--text-secondary)]" aria-hidden />
                      <span className="text-sm font-normal text-[#0F172A] dark:text-[var(--text-primary)]">
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
