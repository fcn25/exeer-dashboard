import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  AI_SUMMARY_MIN_COMPLETION_PERCENT,
  fetchCompletedEvaluationsForCycle,
  generateAndSaveCycleExecutiveSummary,
  getCycleResponseProgress,
  listEvaluationCycles,
} from "../../services/performanceService.js";

function normalizeMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\r\n/g, "\n")
    .trim();
}

function SummaryMarkdown({ content }) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="rounded-3xl border border-exeer-border bg-gradient-to-br from-white to-exeer-surface/40 p-6 text-right text-sm leading-relaxed text-exeer-primary dark:from-[#1e293b] dark:to-[#0f172a] dark:text-slate-100 md:p-8"
    >
      <ReactMarkdown>{normalizeMarkdown(content)}</ReactMarkdown>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="md-surface-muted flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-exeer-primary" aria-hidden />
      <div className="max-w-md space-y-2">
        <p className="text-base font-bold text-exeer-primary">
          جاري تحليل بيانات التقييم...
        </p>
        <p className="text-sm leading-relaxed text-exeer-muted">
          يقوم Gemini Flash بإعداد الملخص التنفيذي للإدارة العليا.
        </p>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryTab() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [aiSummary, setAiSummary] = useState("");
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedCycle = useMemo(
    () => cycles.find((cycle) => String(cycle.id) === String(selectedCycleId)),
    [cycles, selectedCycleId],
  );

  const loadCycles = useCallback(async () => {
    setIsLoadingCycles(true);
    setError("");
    try {
      const rows = await listEvaluationCycles();
      setCycles(rows);
      setSelectedCycleId((current) =>
        current || (rows[0] ? String(rows[0].id) : ""),
      );
    } catch (err) {
      setError(err.message || "تعذّر تحميل دورات التقييم.");
      setCycles([]);
    } finally {
      setIsLoadingCycles(false);
    }
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  useEffect(() => {
    if (!selectedCycleId) {
      setAiSummary("");
      setCompletedCount(0);
      setCompletionPercent(0);
      return undefined;
    }

    let cancelled = false;

    async function loadCycleSummary() {
      setIsLoadingSummary(true);
      setError("");

      try {
        const cycle = cycles.find(
          (item) => String(item.id) === String(selectedCycleId),
        );
        const [completed, progress] = await Promise.all([
          fetchCompletedEvaluationsForCycle(selectedCycleId),
          getCycleResponseProgress(selectedCycleId),
        ]);
        if (cancelled) return;

        setCompletedCount(completed.length);
        setCompletionPercent(progress.percentage);
        setAiSummary(normalizeMarkdown(cycle?.ai_summary ?? ""));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل ملخص الدورة.");
          setCompletedCount(0);
          setCompletionPercent(0);
          setAiSummary("");
        }
      } finally {
        if (!cancelled) setIsLoadingSummary(false);
      }
    }

    loadCycleSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedCycleId, cycles]);

  const handleGenerate = async (force = false) => {
    if (!selectedCycleId || isGenerating) return;
    if (!force && aiSummary) return;

    setIsGenerating(true);
    setError("");

    try {
      const result = await generateAndSaveCycleExecutiveSummary(selectedCycleId);
      setAiSummary(normalizeMarkdown(result.aiSummary));
      setCompletedCount(result.evaluationCount);
      setCompletionPercent(result.completionPercent ?? completionPercent);
      setCycles((prev) =>
        prev.map((cycle) =>
          String(cycle.id) === String(selectedCycleId)
            ? { ...cycle, ai_summary: result.aiSummary }
            : cycle,
        ),
      );
    } catch (err) {
      setError(err.message || "تعذّر توليد الملخص الذكي.");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerateAi = completionPercent >= AI_SUMMARY_MIN_COMPLETION_PERCENT;

  const stats = [
    {
      label: "نسبة الإنجاز",
      value: isLoadingSummary ? "—" : `${completionPercent}%`,
    },
    {
      label: "التقييمات المكتملة",
      value: isLoadingSummary ? "—" : completedCount,
    },
    {
      label: "حالة الملخص",
      value: aiSummary ? "جاهز" : "غير مُولّد",
    },
    {
      label: "الدورة المحددة",
      value: selectedCycle?.name ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-exeer-primary">الملخص التنفيذي</h2>
        <p className="text-sm text-exeer-muted">
          تحليل ذكي لنتائج دورات التقييم — مُخصّص للإدارة العليا.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="md-surface p-5">
            <p className="text-lg font-bold text-exeer-primary">{stat.value}</p>
            <p className="mt-2 text-sm text-exeer-muted">{stat.label}</p>
          </article>
        ))}
      </div>

      <div className="md-surface space-y-5 p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label htmlFor="summary-cycle-select" className="md-label block">
              اختر دورة التقييم
            </label>
            <select
              id="summary-cycle-select"
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              disabled={isLoadingCycles || isGenerating}
              className="md-input"
            >
              <option value="">
                {isLoadingCycles ? "جاري التحميل..." : "اختر دورة"}
              </option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            {!aiSummary ? (
              <div className="group relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleGenerate(false)}
                  disabled={
                    !selectedCycleId ||
                    isGenerating ||
                    isLoadingSummary ||
                    !canGenerateAi
                  }
                  aria-describedby={
                    !canGenerateAi ? "executive-summary-disabled-hint" : undefined
                  }
                  className="md-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  توليد الملخص التنفيذي بالذكاء الاصطناعي
                </button>
                {!canGenerateAi && selectedCycleId ? (
                  <p
                    id="executive-summary-disabled-hint"
                    role="tooltip"
                    className="mt-2 max-w-md rounded-xl border border-exeer-border bg-exeer-surface px-3 py-2 text-xs leading-relaxed text-exeer-muted"
                  >
                    يتطلب توليد الملخص إكمال {AI_SUMMARY_MIN_COMPLETION_PERCENT}% على
                    الأقل من استجابات الدورة. النسبة الحالية: {completionPercent}%.
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={
                  !selectedCycleId || isGenerating || !canGenerateAi
                }
                className="md-btn-tonal inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                إعادة التوليد
              </button>
            )}
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {!selectedCycleId ? (
          <div className="md-surface-muted rounded-3xl px-6 py-14 text-center text-sm text-exeer-muted">
            اختر دورة تقييم لعرض أو توليد الملخص التنفيذي.
          </div>
        ) : isGenerating ? (
          <GeneratingState />
        ) : isLoadingSummary ? (
          <div className="md-surface-muted rounded-3xl px-6 py-14 text-center text-sm text-exeer-muted">
            جاري تحميل بيانات الدورة...
          </div>
        ) : aiSummary ? (
          <SummaryMarkdown content={aiSummary} />
        ) : (
          <div className="md-surface-muted flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-exeer-primary md-elevated">
              <Sparkles className="h-7 w-7 stroke-[1.75]" aria-hidden />
            </span>
            <div className="max-w-md space-y-2">
              <h3 className="text-base font-bold text-exeer-primary">
                {completedCount === 0
                  ? "لا توجد استجابات مكتملة بعد"
                  : !canGenerateAi
                    ? `الإنجاز ${completionPercent}% — يتطلب ${AI_SUMMARY_MIN_COMPLETION_PERCENT}%`
                    : "الملخص غير مُولّد بعد"}
              </h3>
              <p className="text-sm leading-relaxed text-exeer-muted">
                {completedCount === 0
                  ? "أكمل الموظفون تقييماتهم في هذه الدورة لتتمكن من توليد الملخص."
                  : !canGenerateAi
                    ? `عند وصول نسبة الإنجاز إلى ${AI_SUMMARY_MIN_COMPLETION_PERCENT}% يمكنك توليد الملخص التنفيذي.`
                    : "اضغط «توليد الملخص التنفيذي بالذكاء الاصطناعي» لتحليل النتائج."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
