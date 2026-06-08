import { useEffect, useState } from "react";
import { Loader2, TrendingUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listMyTeamEmployees, submitPromotionRequest } from "../../services/myTeamService.js";
import { listCompletedEvaluationSummariesForEmployee } from "../../services/performanceService.js";

export default function MobilePromotionRequestModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [team, setTeam] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [promotionReasons, setPromotionReasons] = useState("");
  const [evaluationResults, setEvaluationResults] = useState("");
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function loadTeam() {
      setIsLoadingTeam(true);
      setError("");
      try {
        const rows = await listMyTeamEmployees();
        if (!cancelled) setTeam(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t("pages.mobile.promotion.loadTeamError"));
          setTeam([]);
        }
      } finally {
        if (!cancelled) setIsLoadingTeam(false);
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [isOpen, t]);

  useEffect(() => {
    if (!isOpen) return;
    setEmployeeId("");
    setPromotionReasons("");
    setEvaluationResults("");
    setError("");
    setIsSaving(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setEvaluationResults("");
      return undefined;
    }

    let cancelled = false;

    async function loadEvaluations() {
      setIsLoadingEvaluations(true);
      try {
        const summary = await listCompletedEvaluationSummariesForEmployee(employeeId);
        if (!cancelled) setEvaluationResults(summary);
      } catch {
        if (!cancelled) {
          setEvaluationResults(
            t("pages.mobile.promotion.evaluationsPlaceholder"),
          );
        }
      } finally {
        if (!cancelled) setIsLoadingEvaluations(false);
      }
    }

    loadEvaluations();
    return () => {
      cancelled = true;
    };
  }, [employeeId, isOpen, t]);

  if (!isOpen) return null;

  const selectedEmployee = team.find(
    (member) => String(member.id) === String(employeeId),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      await submitPromotionRequest({
        employeeId: Number(employeeId),
        employeeName: selectedEmployee?.full_name,
        promotionReasons,
        evaluationResults,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || t("pages.mobile.promotion.submitError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-promotion-request-title"
    >
      <div className="md-surface flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-md sm:max-h-[90vh] sm:rounded-md">
        <header className="shrink-0 border-b border-exeer-border px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <h2
                  id="mobile-promotion-request-title"
                  className="text-lg font-bold text-exeer-primary"
                >
                  {t("pages.mobile.promotion.title")}
                </h2>
                <p className="text-sm text-exeer-muted">
                  {t("pages.mobile.promotion.subtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="space-y-2">
            <label htmlFor="promotion-employee" className="md-label block">
              {t("pages.mobile.promotion.employeeLabel")}
            </label>
            {isLoadingTeam ? (
              <div className="flex items-center gap-2 py-2 text-sm text-exeer-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("common.loading")}
              </div>
            ) : (
              <select
                id="promotion-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                disabled={isSaving || team.length === 0}
                className="md-input"
              >
                <option value="">{t("pages.mobile.promotion.selectEmployee")}</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.job_title_name ? ` — ${member.job_title_name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="promotion-reasons" className="md-label block">
              {t("pages.mobile.promotion.reasonsLabel")}
            </label>
            <textarea
              id="promotion-reasons"
              value={promotionReasons}
              onChange={(e) => setPromotionReasons(e.target.value)}
              rows={4}
              required
              disabled={isSaving}
              placeholder={t("pages.mobile.promotion.reasonsPlaceholder")}
              className="md-input min-h-[100px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="promotion-evaluations" className="md-label block">
              {t("pages.mobile.promotion.evaluationsLabel")}
            </label>
            {isLoadingEvaluations ? (
              <div className="flex items-center gap-2 py-2 text-sm text-exeer-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("pages.mobile.promotion.loadingEvaluations")}
              </div>
            ) : null}
            <textarea
              id="promotion-evaluations"
              value={evaluationResults}
              onChange={(e) => setEvaluationResults(e.target.value)}
              rows={6}
              disabled={isSaving || isLoadingEvaluations}
              placeholder={t("pages.mobile.promotion.evaluationsPlaceholder")}
              className="md-input min-h-[140px] resize-y font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-exeer-muted">
              {t("pages.mobile.promotion.evaluationsHint")}
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || isLoadingTeam || !employeeId}
            className="md-btn-primary w-full"
          >
            {isSaving
              ? t("pages.mobile.promotion.sending")
              : t("pages.mobile.promotion.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
