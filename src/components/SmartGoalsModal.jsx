import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Archive, ArrowRight, Loader2, Target, X } from "lucide-react";
import {
  generateAndSaveSmartGoalArchive,
  listSmartGoalsArchives,
} from "../services/smartGoalsService.js";
import { isRateLimitError } from "../utils/aiRateLimit.js";
import RateLimitToast from "./ui/RateLimitToast.jsx";

function normalizeResultMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\r\n/g, "\n")
    .trim();
}

function formatArchiveDate(value) {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMMM yyyy", { locale: arSA });
  } catch {
    return "—";
  }
}

function stripMarkdown(text) {
  return String(text ?? "")
    .replace(/[#*\-_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArchiveGoals(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((item, index) => {
      const originalGoal = String(item.original_goal ?? "").trim();
      if (!originalGoal) return null;

      return {
        id: String(item.id ?? `goal-${index}`),
        originalGoal,
        smartGoalText: normalizeResultMarkdown(item.smart_goal_text ?? ""),
        createdAt: item.created_at ?? null,
        createdAtLabel: formatArchiveDate(item.created_at),
      };
    })
    .filter(Boolean);
}

function SmartGoalResultContent({ content }) {
  const markdown = normalizeResultMarkdown(content);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="max-h-80 overflow-y-auto rounded-2xl border border-exeer-border bg-white p-4 text-right text-sm text-slate-800 dark:bg-[#1e293b] dark:text-slate-100 sm:max-h-96"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-exeer-border bg-exeer-surface px-4 py-8">
      <Loader2
        className="h-8 w-8 animate-spin text-exeer-primary"
        aria-hidden
      />
      <p className="text-center text-sm font-medium text-exeer-primary">
        جاري تحويل الهدف إلى SMART بالذكاء الاصطناعي...
      </p>
      <p className="text-center text-xs text-exeer-muted">
        قد يستغرق ذلك بضع ثوانٍ
      </p>
    </div>
  );
}

export default function SmartGoalsModal({ isOpen, onClose }) {
  const [roughGoal, setRoughGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");
  const [viewMode, setViewMode] = useState("generate");
  const [archiveGoals, setArchiveGoals] = useState([]);
  const [selectedArchiveGoal, setSelectedArchiveGoal] = useState(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  useEffect(() => {
    if (!isOpen || viewMode !== "archive") return undefined;

    let cancelled = false;

    async function fetchArchive() {
      setIsArchiveLoading(true);
      setArchiveError("");

      try {
        const rows = await listSmartGoalsArchives();
        if (cancelled) return;
        setArchiveGoals(normalizeArchiveGoals(rows));
      } catch (err) {
        if (!cancelled) {
          setArchiveError(err.message || "تعذّر جلب الأرشيف.");
          setArchiveGoals([]);
        }
      } finally {
        if (!cancelled) setIsArchiveLoading(false);
      }
    }

    fetchArchive();
    return () => {
      cancelled = true;
    };
  }, [isOpen, viewMode]);

  const handleClose = () => {
    setViewMode("generate");
    setSelectedArchiveGoal(null);
    setIsLoading(false);
    setArchiveError("");
    setGenerateError("");
    setRateLimitToast("");
    onClose();
  };

  const handleGenerate = async () => {
    const trimmedGoal = roughGoal.trim();
    if (!trimmedGoal || isLoading) return;

    setIsLoading(true);
    setGeneratedResult("");
    setGenerateError("");

    try {
      const { smartGoalText } =
        await generateAndSaveSmartGoalArchive(trimmedGoal);
      setGeneratedResult(smartGoalText);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else {
        setGenerateError(err.message || "تعذّر توليد الهدف الذكي.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen && !rateLimitToast) return null;

  const isArchiveListView = viewMode === "archive";
  const isArchiveDetailView = viewMode === "archive-detail";

  const modalTitle = isArchiveDetailView
    ? "تفاصيل الهدف الذكي"
    : isArchiveListView
      ? "أرشيف الأهداف"
      : "الأهداف الذكية";

  return (
    <>
      <RateLimitToast
        message={rateLimitToast}
        onDismiss={() => setRateLimitToast("")}
      />

      {isOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="md-surface relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:max-h-[90vh] sm:rounded-3xl md:max-w-lg md:p-8 md-elevated">
        <div className="relative shrink-0 px-6 pt-6 md:px-0 md:pt-0">
          <button
            type="button"
            onClick={() => {
              setSelectedArchiveGoal(null);
              setViewMode("archive");
            }}
            className="md-btn-tonal absolute top-6 left-6 flex items-center gap-2 px-3 py-2 text-xs md:top-0 md:left-0"
            disabled={isArchiveDetailView}
          >
            <Archive className="h-4 w-4" aria-hidden />
            الأرشيف
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-2xl border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover dark:bg-[#1e293b] md:top-0 md:right-0"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <h2 className="mb-6 px-4 pt-12 text-center text-xl font-bold text-exeer-primary md:mb-6">
            {modalTitle}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 md:px-0 md:pb-0">
          {isArchiveDetailView ? (
            <div className="flex flex-col gap-4">
              {selectedArchiveGoal?.createdAtLabel ? (
                <p className="text-center text-xs text-exeer-muted">
                  {selectedArchiveGoal.createdAtLabel}
                </p>
              ) : null}
              {selectedArchiveGoal?.originalGoal ? (
                <div className="rounded-2xl border border-exeer-border bg-exeer-surface px-4 py-3">
                  <p className="text-xs font-medium text-exeer-muted">
                    الهدف المبدئي
                  </p>
                  <p className="mt-1 text-sm font-semibold text-exeer-primary">
                    {selectedArchiveGoal.originalGoal}
                  </p>
                </div>
              ) : null}
              {selectedArchiveGoal?.smartGoalText ? (
                <SmartGoalResultContent
                  content={selectedArchiveGoal.smartGoalText}
                />
              ) : (
                <p className="text-center text-sm text-exeer-muted">
                  لا يوجد محتوى لهذا الهدف.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedArchiveGoal(null);
                  setViewMode("archive");
                }}
                className="md-btn-tonal flex w-full items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
                عودة للأرشيف
              </button>
            </div>
          ) : isArchiveListView ? (
            <div className="flex flex-col gap-4">
              {isArchiveLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2
                    className="h-7 w-7 animate-spin text-exeer-primary"
                    aria-hidden
                  />
                  <p className="text-sm text-exeer-muted">جاري التحميل...</p>
                </div>
              ) : archiveError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {archiveError}
                </p>
              ) : archiveGoals.length === 0 ? (
                <p className="text-center text-sm text-exeer-muted">
                  لا توجد سجلات في الأرشيف
                </p>
              ) : (
                <ul className="flex max-h-[360px] flex-col gap-3 overflow-y-auto sm:max-h-[420px]">
                  {archiveGoals.map((goal) => (
                    <li key={goal.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArchiveGoal(goal);
                          setViewMode("archive-detail");
                        }}
                        className="w-full rounded-2xl border border-exeer-border bg-white px-4 py-3 text-start transition-colors hover:bg-exeer-hover dark:bg-[#1e293b]"
                      >
                        <span className="block text-sm font-semibold text-exeer-primary">
                          {goal.originalGoal}
                        </span>
                        <span className="mt-1 block text-xs text-exeer-muted">
                          {goal.createdAtLabel}
                        </span>
                        {goal.smartGoalText ? (
                          <span className="mt-2 line-clamp-2 block text-xs leading-relaxed text-exeer-muted">
                            {stripMarkdown(goal.smartGoalText)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setViewMode("generate")}
                className="md-btn-tonal flex w-full items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
                عودة
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label htmlFor="rough-goal" className="md-label block">
                  الهدف المبدئي
                </label>
                <textarea
                  id="rough-goal"
                  value={roughGoal}
                  onChange={(e) => setRoughGoal(e.target.value)}
                  placeholder="مثال: تحسين رضا الموظفين هذا العام"
                  disabled={isLoading}
                  rows={4}
                  className="md-input min-h-[120px] resize-y sm:min-h-[140px]"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !roughGoal.trim()}
                className="md-btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <Target className="h-4 w-4 stroke-[1.75]" aria-hidden />
                {isLoading ? "جاري التوليد..." : "توليد هدف SMART"}
              </button>
              {isLoading ? <GeneratingState /> : null}
              {generateError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {generateError}
                </p>
              ) : null}
              {!isLoading && generatedResult ? (
                <SmartGoalResultContent content={generatedResult} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
      ) : null}
    </>
  );
}
