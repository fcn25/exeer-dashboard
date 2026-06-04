import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import MobileLoadingState from "../../mobile/MobileLoadingState.jsx";
import {
  AI_SUMMARY_MIN_COMPLETION_PERCENT,
  getCycleResponseProgress,
  listEvaluationCycles,
} from "../../../services/performanceService.js";
import { ensureArray } from "../../../utils/ensureArray.js";

function normalizeMarkdown(text) {
  if (!text) return "";
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

function ProgressBar({ value, label }) {
  const safe = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{safe}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function ScoreCard({ label, value, hint }) {
  return (
    <article className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

export default function MobileExecutiveSummary() {
  const [cycles, setCycles] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = ensureArray(await listEvaluationCycles());
      setCycles(rows);
      const progressEntries = await Promise.all(
        rows.map(async (cycle) => {
          const cycleId = cycle?.id;
          if (cycleId == null) return [cycleId, 0];
          try {
            const stats = await getCycleResponseProgress(cycleId);
            return [cycleId, stats?.percentage ?? 0];
          } catch {
            return [cycleId, 0];
          }
        }),
      );
      const map = Object.fromEntries(
        progressEntries.filter(([id]) => id != null),
      );
      setProgressMap(map);
      setSelectedCycleId((current) => {
        if (current) return current;
        const firstId = rows[0]?.id;
        return firstId != null ? String(firstId) : "";
      });
    } catch (err) {
      setError(err.message || "تعذّر تحميل الملخص.");
      setCycles([]);
      setProgressMap({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const safeCycles = ensureArray(cycles);

  const selectedCycle = useMemo(
    () => safeCycles.find((c) => String(c?.id) === String(selectedCycleId)),
    [safeCycles, selectedCycleId],
  );

  const avgCompletion = useMemo(() => {
    const values = Object.values(progressMap ?? {});
    if (!values.length) return 0;
    return Math.round(
      values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length,
    );
  }, [progressMap]);

  const activeCycles = safeCycles.filter((c) => c?.status === "Active").length;
  const summariesReady = safeCycles.filter((c) =>
    String(c?.ai_summary ?? "").trim(),
  ).length;
  const selectedProgress = progressMap?.[selectedCycleId] ?? 0;
  const aiSummary = normalizeMarkdown(selectedCycle?.ai_summary ?? "");

  if (isLoading) {
    return <MobileLoadingState label="جاري تحميل الملخص التنفيذي..." />;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <ScoreCard
          label="متوسط الإنجاز"
          value={`${avgCompletion}%`}
          hint="عبر دورات الشركة"
        />
        <ScoreCard label="دورات نشطة" value={activeCycles} />
        <ScoreCard
          label="ملخصات جاهزة"
          value={summariesReady}
          hint="للعرض التنفيذي"
        />
        <ScoreCard label="إجمالي الدورات" value={safeCycles.length} />
      </div>

      {safeCycles.length ? (
        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
          <label htmlFor="mobile-summary-cycle" className="text-sm font-bold text-slate-900">
            دورة للعرض
          </label>
          <select
            id="mobile-summary-cycle"
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="md-input min-h-[44px] w-full"
          >
            {safeCycles.map((cycle) => (
              <option key={cycle?.id ?? cycle?.name} value={cycle?.id ?? ""}>
                {cycle?.name ?? "دورة تقييم"}
              </option>
            ))}
          </select>

          <ProgressBar
            value={selectedProgress}
            label="نسبة إكمال الاستجابات"
          />

          {aiSummary ? (
            <div
              dir="rtl"
              lang="ar"
              className="max-h-[320px] overflow-y-auto overscroll-contain rounded-md border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-slate-800"
            >
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-slate-600">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              <p>
                {selectedProgress < AI_SUMMARY_MIN_COMPLETION_PERCENT
                  ? `الملخص الذكي يظهر بعد وصول الإنجاز إلى ${AI_SUMMARY_MIN_COMPLETION_PERCENT}% (الحالي ${selectedProgress}%). يمكن توليده من لوحة الويب.`
                  : "لم يُولَّد الملخص التنفيذي بعد. استخدم لوحة الويب لتوليده."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-gray-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          لا توجد دورات تقييم لعرض الملخص التنفيذي.
        </p>
      )}
    </div>
  );
}
