import { useCallback, useEffect, useState } from "react";
import { CalendarRange, ChevronLeft, Plus } from "lucide-react";
import CreateCycleModal from "./CreateCycleModal.jsx";
import CycleDetailsDrawer from "./CycleDetailsDrawer.jsx";
import {
  CYCLE_STATUS_LABELS,
  getCycleResponseProgress,
  listEvaluationCycles,
} from "../../services/performanceService.js";
import { formatPortalDate } from "../../utils/portalGreeting.js";

function formatCycleDate(value) {
  if (!value) return "—";
  return formatPortalDate(value);
}

function ProgressPill({ percentage }) {
  return (
    <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full bg-exeer-surface px-2 py-0.5 text-[11px] font-semibold text-exeer-primary">
      {percentage}%
    </span>
  );
}

export default function CyclesTab() {
  const [cycles, setCycles] = useState([]);
  const [progressByCycle, setProgressByCycle] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState(null);

  const loadCycles = useCallback(async () => {
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
      setProgressByCycle(Object.fromEntries(progressEntries));
    } catch (err) {
      setError(err.message || "تعذّر تحميل دورات التقييم.");
      setCycles([]);
      setProgressByCycle({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-exeer-primary">دورات التقييم</h2>
            <p className="text-sm text-exeer-muted">
              تتبّع التقدّم وإطلاق الملخص التنفيذي عند اكتمال 80% من الاستجابات.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="md-btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إنشاء دورة جديدة
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <div className="md-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead>
                <tr className="border-b border-exeer-border bg-exeer-surface text-xs text-exeer-muted">
                  <th className="px-4 py-3 font-medium">اسم الدورة</th>
                  <th className="px-4 py-3 font-medium">القسم</th>
                  <th className="px-4 py-3 font-medium">الإنجاز</th>
                  <th className="px-4 py-3 font-medium">تاريخ البداية</th>
                  <th className="px-4 py-3 font-medium">تاريخ النهاية</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-exeer-muted">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : cycles.length ? (
                  cycles.map((cycle) => (
                    <tr
                      key={cycle.id}
                      className="border-b border-exeer-border last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-exeer-primary">
                        {cycle.name}
                      </td>
                      <td className="px-4 py-3 text-exeer-muted">
                        {cycle.target_department ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ProgressPill percentage={progressByCycle[cycle.id] ?? 0} />
                      </td>
                      <td className="px-4 py-3 text-exeer-muted">
                        {formatCycleDate(cycle.start_date)}
                      </td>
                      <td className="px-4 py-3 text-exeer-muted">
                        {formatCycleDate(cycle.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-exeer-surface px-2.5 py-1 text-xs font-medium text-exeer-primary">
                          {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCycleId(cycle.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-md-primary hover:underline"
                        >
                          التفاصيل
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-exeer-surface text-exeer-primary">
                          <CalendarRange className="h-6 w-6 stroke-[1.75]" aria-hidden />
                        </span>
                        <p className="text-sm text-exeer-muted">لا توجد دورات تقييم بعد.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateCycleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadCycles}
      />

      <CycleDetailsDrawer
        cycleId={selectedCycleId}
        onClose={() => setSelectedCycleId(null)}
        onCycleUpdated={loadCycles}
      />
    </>
  );
}
