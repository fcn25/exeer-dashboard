import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import {
  AI_SUMMARY_MIN_COMPLETION_PERCENT,
  getCycleResponseProgress,
  listEvaluationCycles,
} from "../../../services/performanceService.js";

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
      const rows = await listEvaluationCycles();
      setCycles(rows);
      const progressEntries = await Promise.all(
        rows.map(async (cycle) => {
          try {
            const stats = await getCycleResponseProgress(cycle.id);
            return [cycle.id, stats.percentage];
          } catch {
            return [cycle.id, 0];
          }
        }),
      );
      const map = Object.fromEntries(progressEntries);
      setProgressMap(map);
      setSelectedCycleId((current) => current || (rows[0] ? String(rows[0].id) : ""));
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

  const selectedCycle = useMemo(
    () => cycles.find((c) => String(c.id) === String(selectedCycleId)),
    [cycles, selectedCycleId],
  );

  const avgCompletion = useMemo(() => {
    const values = Object.values(progressMap);
    if (!values.length) return 0;
    return Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
  }, [progressMap]);

  const activeCycles = cycles.filter((c) => c.status === "Active").length;
  const summariesReady = cycles.filter((c) => String(c.ai_summary ?? "").trim()).length;
  const selectedProgress = progressMap[selectedCycleId] ?? 0;
  const aiSummary = normalizeMarkdown(selectedCycle?.ai_summary ?? "");

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
          value={isLoading ? "—" : `${avgCompletion}%`}
          hint="عبر دورات الشركة"
        />
        <ScoreCard
          label="دورات نشطة"
          value={isLoading ? "—" : activeCycles}
        />
        <ScoreCard
          label="ملخصات جاهزة"
          value={isLoading ? "—" : summariesReady}
          hint="للعرض التنفيذي"
        />
        <ScoreCard
          label="إجمالي الدورات"
          value={isLoading ? "—" : cycles.length}
        />
      </div>

      {cycles.length ? (
        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
          <label htmlFor="mobile-summary-cycle" className="text-sm font-bold text-slate-900">
            دورة للعرض
          </label>
          <select
            id="mobile-summary-cycle"
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            disabled={isLoading}
            className="md-input min-h-[44px] w-full"
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
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
