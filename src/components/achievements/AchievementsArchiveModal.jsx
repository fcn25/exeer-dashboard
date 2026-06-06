import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Loader2, Trophy, X } from "lucide-react";
import { listEmployeeAchievementsWithEmployees } from "../../services/achievementsService.js";
import { getInitials } from "../employees/employeeFormShared.js";

function formatAchievementDate(value) {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMMM yyyy", { locale: arSA });
  } catch {
    return "—";
  }
}

function mapAchievementRow(row) {
  const employee = row.employees ?? {};

  return {
    id: String(row.id),
    title: String(row.title ?? "").trim(),
    description: String(row.description ?? "").trim(),
    achievementDate: row.achievement_date,
    achievementDateLabel: formatAchievementDate(row.achievement_date),
    employeeName: String(employee.full_name ?? "—").trim() || "—",
  };
}

function EmployeeAvatar({ name }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-exeer-border bg-white text-sm font-bold text-exeer-primary dark:bg-[#334155]">
      {getInitials(name)}
    </span>
  );
}

function AchievementTimelineItem({ item, isLast }) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast ? (
        <span
          className="absolute top-12 bottom-0 start-[1.375rem] w-px bg-exeer-border"
          aria-hidden
        />
      ) : null}

      <div className="relative z-[1] shrink-0">
        <EmployeeAvatar name={item.employeeName} />
      </div>

      <article className="md-surface-muted min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-exeer-primary">
              {item.employeeName}
            </p>
            <h3 className="text-base font-bold text-exeer-primary">
              {item.title}
            </h3>
          </div>
          <time
            dateTime={item.achievementDate ?? undefined}
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-exeer-muted dark:bg-[#1e293b]"
          >
            {item.achievementDateLabel}
          </time>
        </div>
        {item.description ? (
          <p className="mt-3 text-sm leading-relaxed text-exeer-muted">
            {item.description}
          </p>
        ) : null}
      </article>
    </li>
  );
}

export default function AchievementsArchiveModal({ isOpen, onClose }) {
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const rows = await listEmployeeAchievementsWithEmployees();
        if (cancelled) return;
        setAchievements(rows.map(mapAchievementRow).filter((item) => item.title));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل سجل الإنجازات.");
          setAchievements([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-archive-title"
    >
      <div className="md-surface flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-md sm:max-h-[90vh] sm:rounded-md">
        <header className="shrink-0 border-b border-exeer-border px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Trophy className="h-6 w-6 stroke-[1.75]" aria-hidden />
              </span>
              <div className="space-y-1">
                <h2
                  id="achievements-archive-title"
                  className="text-xl font-bold text-exeer-primary sm:text-2xl"
                >
                  سجل الإنجازات
                </h2>
                <p className="text-sm text-exeer-muted">
                  أرشيف إنجازات الموظفين — مرتّب حسب التاريخ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2
                className="h-8 w-8 animate-spin text-exeer-primary"
                aria-hidden
              />
              <p className="text-sm text-exeer-muted">جاري التحميل...</p>
            </div>
          ) : error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-exeer-surface text-exeer-muted">
                <Trophy className="h-8 w-8 stroke-[1.75]" aria-hidden />
              </span>
              <p className="max-w-sm text-sm font-medium text-exeer-muted">
                لا توجد إنجازات مسجّلة بعد — أضف إنجازاً من صفحة تفاصيل الموظف
              </p>
            </div>
          ) : (
            <ol className="space-y-0">
              {achievements.map((item, index) => (
                <AchievementTimelineItem
                  key={item.id}
                  item={item}
                  isLast={index === achievements.length - 1}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
