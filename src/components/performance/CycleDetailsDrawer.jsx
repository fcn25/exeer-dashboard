import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import {
  AI_SUMMARY_MIN_COMPLETION_PERCENT,
  CYCLE_STATUS_LABELS,
  generateAndSaveCycleExecutiveSummary,
  getCycleResponseProgress,
  getEvaluationCycleById,
} from "../../services/performanceService.js";
import { formatPortalDate } from "../../utils/portalGreeting.js";

function normalizeMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\r\n/g, "\n")
    .trim();
}

function CycleProgressBar({ completed, total, percentage }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-exeer-primary">نسبة الإنجاز</span>
        <span className="font-bold text-md-primary">{percentage}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-exeer-surface"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="نسبة إنجاز دورة التقييم"
      >
        <div
          className="h-full rounded-full bg-md-primary transition-all duration-500 dark:bg-slate-700"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      <p className="text-xs text-exeer-muted">
        {completed} مكتمل من أصل {total} — {total - completed} قيد الانتظار
      </p>
    </div>
  );
}

export default function CycleDetailsDrawer({ cycleId, onClose, onCycleUpdated }) {
  const [cycle, setCycle] = useState(null);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadDetails = useCallback(async () => {
    if (!cycleId) return;

    setIsLoading(true);
    setError("");

    try {
      const [cycleRow, progressStats] = await Promise.all([
        getEvaluationCycleById(cycleId),
        getCycleResponseProgress(cycleId),
      ]);
      setCycle(cycleRow);
      setProgress(progressStats);
    } catch (err) {
      setError(err.message || "تعذّر تحميل تفاصيل الدورة.");
    } finally {
      setIsLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (!cycleId) return null;

  const canGenerateAi = progress.percentage >= AI_SUMMARY_MIN_COMPLETION_PERCENT;
  const aiSummary = normalizeMarkdown(cycle?.ai_summary ?? "");

  const handleGenerateAi = async () => {
    if (!canGenerateAi || isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const result = await generateAndSaveCycleExecutiveSummary(cycleId);
      setCycle((prev) => ({ ...prev, ai_summary: result.aiSummary }));
      onCycleUpdated?.();
    } catch (err) {
      setError(err.message || "تعذّر توليد الملخص التنفيذي.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        lang="ar"
        className="relative flex h-full w-full max-w-xl flex-col border-s border-gray-200 bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cycle-details-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 id="cycle-details-title" className="truncate text-lg font-bold text-exeer-primary">
              {cycle?.name ?? "تفاصيل الدورة"}
            </h2>
            {cycle ? (
              <p className="text-xs text-exeer-muted">
                {cycle.target_department ? `القسم: ${cycle.target_department} · ` : ""}
                {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={loadDetails}
              disabled={isLoading || isGenerating}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label="تحديث"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-exeer-muted">جاري التحميل...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="md-surface-muted rounded-md p-3">
                  <p className="text-xs text-exeer-muted">تاريخ البداية</p>
                  <p className="mt-1 font-semibold text-exeer-primary">
                    {formatPortalDate(cycle?.start_date)}
                  </p>
                </div>
                <div className="md-surface-muted rounded-md p-3">
                  <p className="text-xs text-exeer-muted">تاريخ النهاية</p>
                  <p className="mt-1 font-semibold text-exeer-primary">
                    {formatPortalDate(cycle?.end_date)}
                  </p>
                </div>
              </div>

              <div className="md-surface space-y-4 p-4">
                <CycleProgressBar
                  completed={progress.completed}
                  total={progress.total}
                  percentage={progress.percentage}
                />
                {progress.total === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    لا توجد استجابات مرتبطة بهذه الدورة بعد. تأكد من تشغيل migration
                    evaluation_responses.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="group relative">
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    disabled={!canGenerateAi || isGenerating || progress.total === 0}
                    aria-describedby={
                      !canGenerateAi ? "ai-summary-disabled-hint" : undefined
                    }
                    className="md-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                    {isGenerating
                      ? "جاري التوليد..."
                      : "توليد الملخص التنفيذي بالذكاء الاصطناعي"}
                  </button>
                  {!canGenerateAi && progress.total > 0 ? (
                    <p
                      id="ai-summary-disabled-hint"
                      role="tooltip"
                      className="mt-2 rounded-md border border-exeer-border bg-exeer-surface px-3 py-2 text-xs leading-relaxed text-exeer-muted"
                    >
                      يتطلب هذا الإجراء إكمال {AI_SUMMARY_MIN_COMPLETION_PERCENT}% على الأقل
                      من التقييمات. النسبة الحالية: {progress.percentage}%.
                    </p>
                  ) : null}
                </div>
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              ) : null}

              {aiSummary ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-exeer-primary">الملخص التنفيذي</h3>
                  <div
                    dir="rtl"
                    lang="ar"
                    className="rounded-md border border-gray-200 bg-white p-4 text-sm leading-relaxed text-slate-900"
                  >
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
