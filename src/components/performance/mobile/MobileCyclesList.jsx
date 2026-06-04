import { useCallback, useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  CYCLE_STATUS_LABELS,
  getCycleResponseProgress,
  listEvaluationCycles,
} from "../../../services/performanceService.js";
import { formatPortalDate } from "../../../utils/portalGreeting.js";
import { ensureArray } from "../../../utils/ensureArray.js";
import MobileLoadingState from "../../mobile/MobileLoadingState.jsx";

function CycleCard({ cycle, progress }) {
  const statusLabel =
    CYCLE_STATUS_LABELS[cycle?.status] ?? cycle?.status ?? "—";
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <article className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            {cycle?.name ?? "دورة تقييم"}
          </h3>
          <p className="text-xs text-slate-500">
            {cycle?.target_department
              ? `الإدارة: ${cycle.target_department}`
              : "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
          {statusLabel}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <dt>البداية</dt>
          <dd className="font-medium text-slate-800">
            {formatPortalDate(cycle?.start_date)}
          </dd>
        </div>
        <div>
          <dt>النهاية</dt>
          <dd className="font-medium text-slate-800">
            {formatPortalDate(cycle?.end_date)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">نسبة الإنجاز</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {safeProgress}% مكتمل
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export default function MobileCyclesList() {
  const [cycles, setCycles] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCycles = useCallback(async () => {
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
      setProgressMap(
        Object.fromEntries(progressEntries.filter(([id]) => id != null)),
      );
    } catch (err) {
      setError(err.message || "تعذّر تحميل الدورات.");
      setCycles([]);
      setProgressMap({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  if (isLoading) {
    return <MobileLoadingState label="جاري تحميل الدورات..." />;
  }

  const safeCycles = ensureArray(cycles);

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!safeCycles.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-gray-200 bg-white px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-50 text-slate-700">
          <CalendarRange className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm text-slate-500">لا توجد دورات مرسلة بعد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {safeCycles.map((cycle) => (
        <CycleCard
          key={cycle?.id ?? cycle?.name}
          cycle={cycle}
          progress={progressMap?.[cycle?.id] ?? 0}
        />
      ))}
    </div>
  );
}
