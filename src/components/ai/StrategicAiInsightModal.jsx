import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { isRateLimitError } from "../../utils/aiRateLimit.js";
import {
  GEMINI_MISSING_KEY_MESSAGE,
  getGeminiConfigurationError,
} from "../../utils/geminiConfig.js";
import RateLimitToast from "../ui/RateLimitToast.jsx";
import {
  generateExecutiveHealthReport,
  generateManagementRecommendationsReport,
  generatePerformancePredictionsReport,
} from "../../services/strategicAiService.js";

function normalizeMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\r\n/g, "\n")
    .trim();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 rounded-md border border-exeer-border bg-white p-4 dark:bg-[#1e293b]">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 h-20 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function ResultContent({ content }) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="max-h-[min(32rem,60vh)] overflow-y-auto rounded-md border border-exeer-border bg-white p-4 text-right text-sm leading-relaxed text-slate-800 dark:bg-[#1e293b] dark:text-slate-100 sm:p-5"
    >
      <ReactMarkdown>{normalizeMarkdown(content)}</ReactMarkdown>
    </div>
  );
}

const GENERATORS = {
  "executive-health": generateExecutiveHealthReport,
  "performance-predictions": generatePerformancePredictionsReport,
  "management-recommendations": generateManagementRecommendationsReport,
};

export default function StrategicAiInsightModal({
  isOpen,
  onClose,
  tool,
}) {
  const [period, setPeriod] = useState("monthly");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");
  const [meta, setMeta] = useState(null);

  const runGenerate = useCallback(async () => {
    if (!tool?.id) return;

    const configError = getGeminiConfigurationError();
    if (configError) {
      setError(GEMINI_MISSING_KEY_MESSAGE);
      return;
    }

    const generator = GENERATORS[tool.id];
    if (!generator) return;

    setIsLoading(true);
    setError("");
    setContent("");

    try {
      const result =
        tool.supportsPeriod
          ? await generator(period)
          : await generator();

      setContent(result.content ?? "");
      setMeta(result);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else {
        setError(err?.message || "تعذر توليد التحليل. حاول مرة أخرى.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [tool, period]);

  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setError("");
      setMeta(null);
      setPeriod("monthly");
      return undefined;
    }

    runGenerate();
    return undefined;
  }, [isOpen, tool?.id, period, runGenerate]);

  if (!isOpen || !tool) return null;

  return (
    <>
      {rateLimitToast ? (
        <RateLimitToast
          message={rateLimitToast}
          onDismiss={() => setRateLimitToast("")}
        />
      ) : null}

      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="strategic-ai-modal-title"
          className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-exeer-border bg-exeer-surface shadow-xl sm:max-w-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-exeer-border px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-violet-600 dark:text-violet-300">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2
                  id="strategic-ai-modal-title"
                  className="text-base font-semibold text-exeer-primary sm:text-lg"
                >
                  {tool.title}
                </h2>
                <p className="mt-0.5 text-xs text-exeer-muted sm:text-sm">
                  {tool.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-exeer-muted hover:bg-exeer-border/50"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {tool.supportsPeriod ? (
              <div className="mb-4 flex gap-2">
                {[
                  { id: "weekly", label: "أسبوعي" },
                  { id: "monthly", label: "شهري" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPeriod(opt.id)}
                    disabled={isLoading}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                      period === opt.id
                        ? "bg-exeer-primary text-white"
                        : "border border-exeer-border bg-white text-exeer-muted hover:border-exeer-primary/40 dark:bg-[#1e293b]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}

            {isLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-exeer-primary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>جاري تحليل بيانات المنشأة بالذكاء الاصطناعي...</span>
                </div>
                <LoadingSkeleton />
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : (
              <>
                {meta?.industry ? (
                  <p className="mb-3 text-xs text-exeer-muted">
                    القطاع: {meta.industry}
                    {meta.periodLabel ? ` · الفترة: ${meta.periodLabel}` : ""}
                  </p>
                ) : null}
                <ResultContent content={content} />
              </>
            )}
          </div>

          <div className="flex gap-2 border-t border-exeer-border px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={runGenerate}
              disabled={isLoading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-exeer-border bg-white px-4 py-2.5 text-sm font-medium text-exeer-primary hover:bg-exeer-surface disabled:opacity-50 dark:bg-[#1e293b]"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden
              />
              إعادة التوليد
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-exeer-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
