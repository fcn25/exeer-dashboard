import { useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, X } from "lucide-react";
import { generateAndSaveEmployeePersonalReport } from "../../services/employeeReportService.js";
import { isRateLimitError } from "../../utils/aiRateLimit.js";
import RateLimitToast from "../ui/RateLimitToast.jsx";

function normalizeMarkdown(text) {
  if (!text) return "";
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

function ReportBody({ content }) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="max-h-72 overflow-y-auto rounded-2xl border border-white/20 bg-white/90 p-4 text-right text-sm text-slate-800 dark:bg-[#1e293b]/90 dark:text-slate-100"
    >
      <ReactMarkdown>{normalizeMarkdown(content)}</ReactMarkdown>
    </div>
  );
}

export default function PersonalMentorCard({ employeeId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const result = await generateAndSaveEmployeePersonalReport(employeeId);
      setReportContent(result.reportContent);
      setGeneratedAt(
        format(new Date(), "d MMMM yyyy", { locale: arSA }),
      );
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else {
        setError(err.message || "تعذّر توليد التقرير.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <RateLimitToast
        message={rateLimitToast}
        onDismiss={() => setRateLimitToast("")}
      />

      <article className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-[#1a2744] via-[#243656] to-[#2f4a73] p-6 text-white shadow-lg dark:border-indigo-900/50">
        <div className="pointer-events-none absolute -start-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -end-6 h-36 w-36 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                مرشدك الذكي
              </span>
              <h3 className="text-xl font-bold">تقرير الأداء الشهري</h3>
              <p className="text-sm leading-relaxed text-indigo-100/90">
                تحليل شخصي محفّز مبني على مهامك وإنجازاتك — مرة واحدة كل 28 يوماً.
              </p>
            </div>
          </div>

          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
              <p className="text-center text-sm font-medium">
                جاري تحليل أدائك وتوليد التقرير...
              </p>
            </div>
          ) : reportContent ? (
            <div className="space-y-3">
              {generatedAt ? (
                <p className="text-xs text-indigo-100/80">تاريخ التوليد: {generatedAt}</p>
              ) : null}
              <ReportBody content={reportContent} />
              <button
                type="button"
                onClick={() => {
                  setReportContent("");
                  setGeneratedAt("");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden />
                إخفاء التقرير
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#1a2744] transition-transform hover:scale-[1.01]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              توليد تقريري الشخصي
            </button>
          )}

          {error ? (
            <p className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}
