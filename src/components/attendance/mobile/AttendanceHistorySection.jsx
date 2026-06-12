import { useState } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";
import {
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  MOBILE_CARD,
  TYPE_ITEM,
  TYPE_META,
  TYPE_SECTION,
} from "../../home/homeStyles.js";

function HistoryDayRow({ record, isExpanded }) {
  const isLeave = record.status === "leave";

  return (
    <div className={HOME_LIST_ITEM}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={TYPE_ITEM}>{record.dayLabel}</p>
          <p className={TYPE_META}>{record.dateLabel}</p>
        </div>
        <div className="text-end">
          {isLeave ? (
            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
              {record.statusLabel}
            </span>
          ) : (
            <>
              <p className={`${TYPE_ITEM} tabular-nums`}>{record.workingHours}</p>
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
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#F0EEEA] pt-3 dark:border-[rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0EEEA] bg-white px-2.5 py-1.5 text-xs font-medium text-exeer-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]">
            <LogIn className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            دخول {record.checkIn}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0EEEA] bg-white px-2.5 py-1.5 text-xs font-medium text-exeer-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]">
            <LogOut className="h-3.5 w-3.5 text-rose-600" aria-hidden />
            خروج {record.checkOut}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function AttendanceHistorySection({ records = [], isLoading = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const toggleDay = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <section className={MOBILE_CARD}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 text-start"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className={TYPE_SECTION}>سجل آخر شهر</h2>
          <p className={`${TYPE_META} mt-0.5`}>
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
        <div className={`${HOME_LIST_DIVIDE} mt-4 border-t border-[#F0EEEA] pt-2 dark:border-[rgba(255,255,255,0.06)]`}>
          {isLoading ? (
            <p className={`${TYPE_META} py-6 text-center`}>جاري التحميل...</p>
          ) : records.length === 0 ? (
            <p className={`${TYPE_META} py-6 text-center`}>
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
