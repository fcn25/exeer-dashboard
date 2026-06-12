import { LogIn, LogOut, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  MOBILE_CARD,
  TYPE_ITEM,
  TYPE_META,
  TYPE_SECTION,
} from "../../home/homeStyles.js";

function OperationRow({ log }) {
  const isCheckIn = log.punchType === "In";

  return (
    <div className={HOME_LIST_ITEM}>
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
            <p className={TYPE_ITEM}>{log.punchTypeLabel}</p>
            <p className={`${TYPE_META} mt-0.5`}>{log.punchedAtLabel}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#F0EEEA] bg-white px-2 py-0.5 text-[10px] font-medium text-exeer-muted dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-secondary)]">
          {log.branchName}
        </span>
      </div>
      {log.gpsCoordinates && log.gpsCoordinates !== "—" ? (
        <p className={`${TYPE_META} mt-2 flex items-center gap-1.5`}>
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {log.gpsCoordinates}
        </p>
      ) : null}
    </div>
  );
}

export default function AttendanceOperationsSection({
  logs = [],
  isLoading = false,
}) {
  const { t } = useTranslation();

  return (
    <section className={MOBILE_CARD} aria-labelledby="attendance-operations-heading">
      <header className="border-b border-[#F0EEEA] pb-4 dark:border-[rgba(255,255,255,0.06)]">
        <h2 id="attendance-operations-heading" className={TYPE_SECTION}>
          {t("pages.mobile.attendance.operationsTitle")}
        </h2>
        <p className={`${TYPE_META} mt-0.5`}>
          {t("pages.mobile.attendance.operationsSubtitle", { count: logs.length })}
        </p>
      </header>

      <div className={`${HOME_LIST_DIVIDE} pt-2`}>
        {isLoading ? (
          <p className={`${TYPE_META} py-6 text-center`}>{t("common.loading")}</p>
        ) : logs.length === 0 ? (
          <p className={`${TYPE_META} py-6 text-center`}>
            {t("pages.mobile.attendance.operationsEmpty")}
          </p>
        ) : (
          logs.map((log) => <OperationRow key={log.id} log={log} />)
        )}
      </div>
    </section>
  );
}
