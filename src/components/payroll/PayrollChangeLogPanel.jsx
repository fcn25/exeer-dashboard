import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  formatPayrollCurrency,
  PAYROLL_CHANGE_LOG_FIELD_LABELS,
} from "../../utils/payroll/payrollTableConfig.js";
import { groupPayrollChangeLogByEmployee } from "../../services/payrollService.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";

function formatChangedAt(value) {
  return formatLocaleDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFieldLabel(fieldName) {
  return PAYROLL_CHANGE_LOG_FIELD_LABELS[fieldName] ?? fieldName ?? "—";
}

function formatLoggedValue(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isFinite(num)) return formatPayrollCurrency(num);
  return String(value);
}

export default function PayrollChangeLogPanel({
  title = "تقرير تعديلات المحاسب",
  entries = [],
  isLoading = false,
  error = "",
  compact = false,
}) {
  const grouped = useMemo(
    () => groupPayrollChangeLogByEmployee(entries),
    [entries],
  );

  if (isLoading) {
    return (
      <section className="rounded-md border border-gray-200 bg-white p-5 shadow-none">
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          جاري تحميل سجل التعديلات...
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-md border border-indigo-200 bg-indigo-50/40 shadow-none ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">
          سجل التغييرات على الحقول المالية قبل اعتماد المسير
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!error && grouped.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          لم يتم تعديل أي قيم
        </p>
      ) : null}

      {!error && grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <article
              key={`${group.employeeId ?? group.employeeName}`}
              className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none"
            >
              <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {group.employeeName}
                </h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600">
                      <th className="px-4 py-2 text-center font-semibold">
                        الحقل
                      </th>
                      <th className="px-4 py-2 text-center font-semibold">
                        القيمة القديمة
                      </th>
                      <th className="px-4 py-2 text-center font-semibold">
                        القيمة الجديدة
                      </th>
                      <th className="px-4 py-2 text-center font-semibold">
                        بواسطة
                      </th>
                      <th className="px-4 py-2 text-center font-semibold">
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.changes.map((change) => (
                      <tr
                        key={change.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-center font-medium text-slate-800">
                          {formatFieldLabel(change.fieldName)}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                          {formatLoggedValue(change.oldValue)}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-900">
                          {formatLoggedValue(change.newValue)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">
                          {change.changedBy}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {formatChangedAt(change.changedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
