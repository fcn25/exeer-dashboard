import { LogIn, LogOut, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

function OperationRow({ log }) {
  const isCheckIn = log.punchType === "In";

  return (
    <article className="rounded-xl border border-exeer-border bg-slate-50/80 px-4 py-3 dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isCheckIn
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            }`}
          >
            {isCheckIn ? (
              <LogIn className="h-4 w-4" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
              {log.punchTypeLabel}
            </p>
            <p className="mt-0.5 text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
              {log.punchedAtLabel}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-exeer-muted ring-1 ring-slate-200 dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)] dark:ring-[var(--border-color)]">
          {log.branchName}
        </span>
      </div>
      {log.gpsCoordinates && log.gpsCoordinates !== "—" ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {log.gpsCoordinates}
        </p>
      ) : null}
    </article>
  );
}

export default function AttendanceOperationsSection({
  logs = [],
  isLoading = false,
}) {
  const { t } = useTranslation();

  return (
    <section
      className="rounded-2xl border border-exeer-border bg-white shadow-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      aria-labelledby="attendance-operations-heading"
    >
      <header className="border-b border-exeer-border px-5 py-4 dark:border-[var(--border-color)]">
        <h2
          id="attendance-operations-heading"
          className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
        >
          {t("pages.mobile.attendance.operationsTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
          {t("pages.mobile.attendance.operationsSubtitle", { count: logs.length })}
        </p>
      </header>

      <div className="space-y-2.5 px-4 py-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-exeer-muted">
            {t("common.loading")}
          </p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-exeer-muted dark:text-[var(--text-secondary)]">
            {t("pages.mobile.attendance.operationsEmpty")}
          </p>
        ) : (
          logs.map((log) => <OperationRow key={log.id} log={log} />)
        )}
      </div>
    </section>
  );
}
