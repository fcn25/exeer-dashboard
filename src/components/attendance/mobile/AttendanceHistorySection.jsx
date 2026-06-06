import { useState } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";

function HistoryDayRow({ record, isExpanded }) {
  const isLeave = record.status === "leave";

  return (
    <article
      className={`rounded-xl border border-exeer-border bg-slate-50/80 px-4 py-3.5 transition-colors dark:bg-slate-900/40 ${
        isExpanded ? "shadow-sm" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-exeer-primary">{record.dayLabel}</p>
          <p className="text-xs text-exeer-muted">{record.dateLabel}</p>
        </div>
        <div className="text-end">
          {isLeave ? (
            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
              {record.statusLabel}
            </span>
          ) : (
            <>
              <p className="text-sm font-bold text-exeer-primary">{record.workingHours}</p>
              {record.delayMinutes > 0 ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  تأخير {record.delayMinutes} د
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {isExpanded && !isLeave ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-exeer-border pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-exeer-primary shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700">
            <LogIn className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            دخول {record.checkIn}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-exeer-primary shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700">
            <LogOut className="h-3.5 w-3.5 text-rose-600" aria-hidden />
            خروج {record.checkOut}
          </span>
        </div>
      ) : null}
    </article>
  );
}

export default function AttendanceHistorySection({ records = [], isLoading = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const toggleDay = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <section className="rounded-2xl border border-exeer-border bg-white shadow-sm dark:bg-md-surface">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-sm font-bold text-exeer-primary">سجل آخر شهر</h2>
          <p className="mt-0.5 text-xs text-exeer-muted">
            {records.length} يوم مسجّل
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-exeer-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen ? (
        <div className="space-y-2.5 border-t border-exeer-border px-4 py-4">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-exeer-muted">جاري التحميل...</p>
          ) : records.length === 0 ? (
            <p className="py-6 text-center text-sm text-exeer-muted">
              لا توجد سجلات حضور سابقة.
            </p>
          ) : null}
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => toggleDay(record.id)}
              className="block w-full text-start"
              aria-expanded={expandedId === record.id}
            >
              <HistoryDayRow
                record={record}
                isExpanded={expandedId === record.id}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
