import {
  ADMINISTRATIVE_ACTION_TYPE_LABELS,
  SALARY_DEDUCTION_ACTION_TYPE,
} from "../../constants/administrativeActions.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";

function formatDate(value) {
  return formatLocaleDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

const TYPE_CLASS = {
  Alert: "bg-slate-100 text-slate-800",
  "First Warning": "bg-amber-50 text-amber-900",
  "Second Warning": "bg-orange-50 text-orange-900",
  "Third Warning": "bg-red-50 text-red-900",
  "salary deduction": "bg-violet-50 text-violet-900",
  suspension: "bg-slate-200 text-slate-900",
};

/**
 * @param {{ rows: object[], isLoading?: boolean }} props
 */
export default function AdministrativeActionsTable({
  rows,
  isLoading = false,
}) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-none">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                التاريخ
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                الموظف
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                النوع
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                السبب
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                مبلغ الخصم
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-900">
                أُصدر بواسطة
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  جاري التحميل...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  لا توجد إجراءات مسجّلة
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(row.actionDate)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {row.employeeName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.employeeNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_CLASS[row.actionType] ?? "bg-gray-50 text-slate-700"}`}
                    >
                      {ADMINISTRATIVE_ACTION_TYPE_LABELS[row.actionType] ??
                        row.actionType}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-700">
                    <p className="line-clamp-2">{row.reason}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-900">
                    {row.actionType === SALARY_DEDUCTION_ACTION_TYPE
                      ? formatMoney(row.penaltyAmount)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.issuedByName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
