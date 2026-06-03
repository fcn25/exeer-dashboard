import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Archive, ArrowRight, FileText, Loader2, X } from "lucide-react";
import {
  generateAndSaveMonthlyReport,
  listMonthlyReports,
} from "../services/reportsService.js";
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

function normalizeReportRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((item, index) => ({
    id: String(item.id ?? `report-${index}`),
    reportContent: normalizeResultMarkdown(item.report_content ?? ""),
    createdAtLabel: formatArchiveDate(item.created_at),
  }));
}

function ReportResultContent({ content }) {
  const markdown = normalizeResultMarkdown(content);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="max-h-[28rem] overflow-y-auto rounded-md border border-exeer-border bg-white p-4 text-right text-sm text-slate-800 dark:bg-[#1e293b] dark:text-slate-100 sm:max-h-[32rem] sm:p-5"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-exeer-border bg-exeer-surface px-4 py-10">
      <Loader2
        className="h-8 w-8 animate-spin text-exeer-primary"
        aria-hidden
      />
      <p className="text-center text-sm font-medium text-exeer-primary">
        جاري تحليل بيانات المنشأة وتوليد التقرير الشهري...
      </p>
      <p className="text-center text-xs text-exeer-muted">
        يتم تخصيص التقرير حسب قطاع منشأتك
      </p>
    </div>
  );
}

export default function MonthlyReportModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState("");
  const [industryLabel, setIndustryLabel] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");
  const [viewMode, setViewMode] = useState("generate");
  const [archiveReports, setArchiveReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  useEffect(() => {
    if (!isOpen || viewMode !== "archive") return undefined;

    let cancelled = false;

    async function fetchArchive() {
      setIsArchiveLoading(true);
      setArchiveError("");

      try {
        const rows = await listMonthlyReports();
        if (cancelled) return;
        setArchiveReports(normalizeReportRows(rows));
      } catch (err) {
        if (!cancelled) {
          setArchiveError(err.message || "تعذّر جلب الأرشيف.");
          setArchiveReports([]);
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
    setSelectedReport(null);
    setIsLoading(false);
    setArchiveError("");
    setGenerateError("");
    setRateLimitToast("");
    onClose();
  };

  const handleGenerate = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setGeneratedResult("");
    setIndustryLabel("");
    setGenerateError("");

    try {
      const result = await generateAndSaveMonthlyReport();
      setGeneratedResult(result.reportContent);
      setIndustryLabel(result.industry);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else {
        setGenerateError(err.message || "تعذّر توليد التقرير.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen && !rateLimitToast) return null;

  const isArchiveListView = viewMode === "archive";
  const isArchiveDetailView = viewMode === "archive-detail";

  const modalTitle = isArchiveDetailView
    ? "تقرير شهري محفوظ"
    : isArchiveListView
      ? "أرشيف التقارير الشهرية"
      : "التقرير الشهري الذكي";

  return (
    <>
      <RateLimitToast
        message={rateLimitToast}
        onDismiss={() => setRateLimitToast("")}
      />

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="md-surface relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-md sm:max-h-[90vh] sm:rounded-md">
            <div className="relative shrink-0 border-b border-exeer-border px-6 pt-6 pb-5 sm:px-8">
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setViewMode("archive");
                }}
                className="md-btn-tonal absolute top-6 left-6 flex items-center gap-2 px-3 py-2 text-xs sm:left-8"
                disabled={isArchiveDetailView}
              >
                <Archive className="h-4 w-4" aria-hidden />
                الأرشيف
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover dark:bg-[#1e293b] sm:right-8"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <h2 className="px-4 pt-12 text-center text-xl font-bold text-exeer-primary sm:text-2xl">
                {modalTitle}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {isArchiveDetailView ? (
                <div className="flex flex-col gap-4">
                  {selectedReport?.createdAtLabel ? (
                    <p className="text-center text-xs text-exeer-muted">
                      {selectedReport.createdAtLabel}
                    </p>
                  ) : null}
                  {selectedReport?.reportContent ? (
                    <ReportResultContent content={selectedReport.reportContent} />
                  ) : (
                    <p className="text-center text-sm text-exeer-muted">
                      لا يوجد محتوى لهذا التقرير.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReport(null);
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
                  ) : archiveReports.length === 0 ? (
                    <p className="text-center text-sm text-exeer-muted">
                      لا توجد تقارير شهرية محفوظة
                    </p>
                  ) : (
                    <ul className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">
                      {archiveReports.map((report) => (
                        <li key={report.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setViewMode("archive-detail");
                            }}
                            className="w-full rounded-md border border-exeer-border bg-white px-4 py-3 text-start transition-colors hover:bg-exeer-hover dark:bg-[#1e293b]"
                          >
                            <span className="block text-sm font-semibold text-exeer-primary">
                              تقرير شهري — {report.createdAtLabel}
                            </span>
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
                <div className="mx-auto flex max-w-3xl flex-col gap-5">
                  <div className="md-surface-muted space-y-2 p-5 text-center">
                    <p className="text-sm text-exeer-muted">
                      يُولَّد التقرير بناءً على قطاع المنشأة وبيانات الأداء
                      الحالية (الموظفون، المهام المكتملة، الإنجازات).
                    </p>
                    <p className="text-xs text-exeer-muted">
                      محاولة واحدة كل 28 يوماً — يمكن ضبط القطاع من الإعدادات
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="md-btn-primary inline-flex w-full items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4 stroke-[1.75]" aria-hidden />
                    {isLoading ? "جاري التوليد..." : "توليد التقرير الشهري"}
                  </button>

                  {isLoading ? <GeneratingState /> : null}

                  {generateError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                      {generateError}
                    </p>
                  ) : null}

                  {!isLoading && industryLabel ? (
                    <p className="text-center text-xs font-medium text-exeer-muted">
                      قطاع المنشأة:{" "}
                      <span className="text-exeer-primary">{industryLabel}</span>
                    </p>
                  ) : null}

                  {!isLoading && generatedResult ? (
                    <ReportResultContent content={generatedResult} />
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
