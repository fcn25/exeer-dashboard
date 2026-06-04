import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Archive, ArrowRight, Loader2, X } from "lucide-react";
import {
  generateAndSaveInterviewArchive,
  listInterviewArchives,
} from "../services/interviewService.js";
import { listJobTitles } from "../services/catalogService.js";
import { isRateLimitError } from "../utils/aiRateLimit.js";
import {
  GEMINI_MISSING_KEY_MESSAGE,
  getGeminiConfigurationError,
} from "../utils/geminiConfig.js";
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

function normalizeArchiveJobs(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((item, index) => {
      const title = String(item.job_title ?? "").trim();
      if (!title) return null;

      return {
        id: String(item.id ?? `archive-${index}`),
        title,
        questionsText: normalizeResultMarkdown(item.questions_text ?? ""),
        createdAt: item.created_at ?? null,
        createdAtLabel: formatArchiveDate(item.created_at),
      };
    })
    .filter(Boolean);
}

function InterviewResultContent({ content }) {
  const markdown = normalizeResultMarkdown(content);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="max-h-72 overflow-y-auto rounded-md border border-exeer-border bg-white p-4 text-right text-sm text-slate-800 dark:bg-[#1e293b] dark:text-slate-100"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-exeer-border bg-exeer-surface px-4 py-8">
      <Loader2
        className="h-8 w-8 animate-spin text-exeer-primary"
        aria-hidden
      />
      <p className="text-center text-sm font-medium text-exeer-primary">
        جاري توليد الأسئلة بالذكاء الاصطناعي...
      </p>
      <p className="text-center text-xs text-exeer-muted">
        قد يستغرق ذلك بضع ثوانٍ
      </p>
    </div>
  );
}

export default function SmartInterviewModal({ isOpen, onClose }) {
  const [jobTitle, setJobTitle] = useState("");
  const [jobTitleOptions, setJobTitleOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewResult, setInterviewResult] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [geminiConfigError, setGeminiConfigError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");
  const [viewMode, setViewMode] = useState("generate");
  const [archiveJobs, setArchiveJobs] = useState([]);
  const [selectedArchiveJob, setSelectedArchiveJob] = useState(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    setGeminiConfigError(getGeminiConfigurationError() ?? "");
    setGenerateError("");

    let cancelled = false;

    listJobTitles()
      .then((titles) => {
        if (!cancelled) setJobTitleOptions(titles);
      })
      .catch(() => {
        if (!cancelled) setJobTitleOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || viewMode !== "archive") return undefined;

    let cancelled = false;

    async function fetchArchive() {
      setIsArchiveLoading(true);
      setArchiveError("");

      try {
        const rows = await listInterviewArchives();
        if (cancelled) return;
        setArchiveJobs(normalizeArchiveJobs(rows));
      } catch (err) {
        if (!cancelled) {
          setArchiveError(err.message || "تعذّر جلب الأرشيف.");
          setArchiveJobs([]);
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
    setSelectedArchiveJob(null);
    setIsLoading(false);
    setArchiveError("");
    setGenerateError("");
    setGeminiConfigError("");
    setRateLimitToast("");
    onClose();
  };

  const handleGenerate = async () => {
    const trimmedTitle = jobTitle.trim();
    if (!trimmedTitle || isLoading) return;

    const configError = getGeminiConfigurationError();
    if (configError) {
      setGeminiConfigError(configError);
      setGenerateError(configError);
      return;
    }

    setIsLoading(true);
    setInterviewResult("");
    setGenerateError("");
    setGeminiConfigError("");

    try {
      const { questionsText } =
        await generateAndSaveInterviewArchive(trimmedTitle);
      setInterviewResult(questionsText);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else if (err?.message === GEMINI_MISSING_KEY_MESSAGE) {
        setGeminiConfigError(GEMINI_MISSING_KEY_MESSAGE);
        setGenerateError(GEMINI_MISSING_KEY_MESSAGE);
      } else {
        setGenerateError(err.message || "تعذّر توليد الأسئلة.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen && !rateLimitToast) return null;

  const isArchiveListView = viewMode === "archive";
  const isArchiveDetailView = viewMode === "archive-detail";

  const modalTitle = isArchiveDetailView
    ? selectedArchiveJob?.title ?? "تفاصيل المقابلة"
    : isArchiveListView
      ? "أرشيف المقابلات"
      : "توليد أسئلة المقابلة الذكية";

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
      <div className="md-surface relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-md sm:max-h-[90vh] sm:rounded-md md:max-w-lg md:p-8">
        <div className="relative shrink-0 px-6 pt-6 md:px-0 md:pt-0">
          <button
            type="button"
            onClick={() => {
              setSelectedArchiveJob(null);
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
            className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover dark:bg-[#1e293b] md:top-0 md:right-0"
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
              {selectedArchiveJob?.createdAtLabel ? (
                <p className="text-center text-xs text-exeer-muted">
                  {selectedArchiveJob.createdAtLabel}
                </p>
              ) : null}
              {selectedArchiveJob?.questionsText ? (
                <InterviewResultContent
                  content={selectedArchiveJob.questionsText}
                />
              ) : (
                <p className="text-center text-sm text-exeer-muted">
                  لا يوجد محتوى مقابلة لهذا السجل.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedArchiveJob(null);
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
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {archiveError}
                </p>
              ) : archiveJobs.length === 0 ? (
                <p className="text-center text-sm text-exeer-muted">
                  لا توجد سجلات في الأرشيف
                </p>
              ) : (
                <ul className="flex max-h-[360px] flex-col gap-3 overflow-y-auto sm:max-h-[420px]">
                  {archiveJobs.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArchiveJob(job);
                          setViewMode("archive-detail");
                        }}
                        className="w-full rounded-md border border-exeer-border bg-white px-4 py-3 text-start transition-colors hover:bg-exeer-hover dark:bg-[#1e293b]"
                      >
                        <span className="block text-sm font-semibold text-exeer-primary">
                          {job.title}
                        </span>
                        <span className="mt-1 block text-xs text-exeer-muted">
                          {job.createdAtLabel}
                        </span>
                        {job.questionsText ? (
                          <span className="mt-2 line-clamp-2 block text-xs leading-relaxed text-exeer-muted">
                            {job.questionsText.replace(/[#*\-]/g, "").trim()}
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
              <input
                type="text"
                list="interview-job-titles"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="أدخل المسمى الوظيفي..."
                disabled={isLoading}
                className="md-input"
              />
              {jobTitleOptions.length > 0 ? (
                <datalist id="interview-job-titles">
                  {jobTitleOptions.map((title) => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              ) : null}
              {geminiConfigError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  {geminiConfigError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  isLoading || !jobTitle.trim() || Boolean(geminiConfigError)
                }
                className="md-btn-primary w-full"
              >
                {isLoading ? "جاري التوليد..." : "توليد الأسئلة"}
              </button>
              {isLoading ? <GeneratingState /> : null}
              {generateError && generateError !== geminiConfigError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {generateError}
                </p>
              ) : null}
              {!isLoading && interviewResult ? (
                <InterviewResultContent content={interviewResult} />
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
