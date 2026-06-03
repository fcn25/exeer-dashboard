import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ClipboardCheck } from "lucide-react";
import TakeEvaluationModal from "./TakeEvaluationModal.jsx";
import { listPendingEvaluationsForEmployee } from "../../services/performanceService.js";
import { formatPortalDate } from "../../utils/portalGreeting.js";

function PendingEvaluationCard({ evaluation, onSelect }) {
  const cycleName = evaluation.evaluation_cycles?.name ?? "دورة تقييم";
  const endDate = evaluation.evaluation_cycles?.end_date;
  const templateTitle = evaluation.evaluation_templates?.title ?? "نموذج تقييم";

  return (
    <button
      type="button"
      onClick={() => onSelect(evaluation)}
      className="group flex w-full flex-col gap-4 rounded-md border border-amber-200 bg-amber-50/30 p-5 text-right transition-colors hover:border-amber-300 hover:bg-amber-50/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          مطلوب إجراء التقييم
        </span>
        <ChevronLeft
          className="h-5 w-5 text-exeer-muted transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-exeer-primary">{templateTitle}</h3>
        <p className="text-sm text-exeer-muted">{cycleName}</p>
      </div>

      {endDate ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-exeer-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          ينتهي في {formatPortalDate(endDate)}
        </p>
      ) : null}
    </button>
  );
}

export default function PendingEvaluationsSection({
  employeeId,
  onEvaluationSubmitted,
}) {
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  const loadEvaluations = useCallback(async () => {
    if (!employeeId) {
      setEvaluations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const rows = await listPendingEvaluationsForEmployee(employeeId);
      setEvaluations(rows);
    } catch (err) {
      setError(err.message || "تعذّر تحميل التقييمات.");
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const handleSuccess = () => {
    onEvaluationSubmitted?.();
    loadEvaluations();
  };

  return (
    <>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="md-surface-muted px-4 py-8 text-center text-sm text-exeer-muted">
          جاري التحميل...
        </div>
      ) : evaluations.length ? (
        <div className="grid gap-4">
          {evaluations.map((evaluation) => (
            <PendingEvaluationCard
              key={evaluation.id}
              evaluation={evaluation}
              onSelect={setSelectedEvaluation}
            />
          ))}
        </div>
      ) : (
        <div className="md-surface-muted rounded-md px-4 py-10 text-center">
          <p className="text-sm text-exeer-muted">لا توجد تقييمات معلّقة حالياً.</p>
        </div>
      )}

      <TakeEvaluationModal
        evaluation={selectedEvaluation}
        isOpen={Boolean(selectedEvaluation)}
        onClose={() => setSelectedEvaluation(null)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
