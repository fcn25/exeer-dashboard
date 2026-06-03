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
      className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4 text-right text-sm text-slate-800"
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

      <article className="rounded-md border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-slate-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                مرشدك الذكي
              </span>
              <h3 className="text-xl font-semibold text-slate-900">تقرير الأداء الشهري</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                تحليل شخصي محفّز مبني على مهامك وإنجازاتك — مرة واحدة كل 28 يوماً.
              </p>
            </div>
          </div>

          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-900" aria-hidden />
              <p className="text-center text-sm font-medium text-slate-700">
                جاري تحليل أدائك وتوليد التقرير...
              </p>
            </div>
          ) : reportContent ? (
            <div className="space-y-3">
              {generatedAt ? (
                <p className="text-xs text-slate-500">تاريخ التوليد: {generatedAt}</p>
              ) : null}
              <ReportBody content={reportContent} />
              <button
                type="button"
                onClick={() => {
                  setReportContent("");
                  setGeneratedAt("");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-gray-50"
              >
                <X className="h-4 w-4" aria-hidden />
                إخفاء التقرير
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="md-btn-primary inline-flex w-full items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              توليد تقريري الشخصي
            </button>
          )}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}
