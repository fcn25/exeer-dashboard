import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  CalendarRange,
  ClipboardList,
  Settings2,
  Upload,
} from "lucide-react";
import { canManageAttendanceSettings } from "../utils/rbac.js";
import { DateInput } from "../components/ui/DateInput.jsx";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import ExeerEmptyState from "../components/brand/ExeerEmptyState.jsx";
import {
  exportAttendanceDeductionsToPayroll,
  fetchAttendanceRecords,
  upsertAttendanceFromCsv,
} from "../services/attendanceService.js";
import { downloadAttendanceTemplateCsv } from "../utils/attendance/csvTemplate.js";
import { parseAttendanceCsvFile } from "../utils/attendance/parseAttendanceCsv.js";
import {
  computeAttendanceSummary,
  formatGridCell,
  formatSummaryStat,
} from "../utils/attendance/stats.js";

const SUBTITLE =
  "سجل الحضور والانصراف — عرض للقراءة فقط. تُحدَّث البيانات عبر استيراد ملف البصمة CSV فقط.";

const TABLE_COLUMNS = [
  { key: "employeeNumber", label: "الرقم الوظيفي" },
  { key: "employeeName", label: "اسم الموظف" },
  { key: "recordDate", label: "التاريخ" },
  { key: "shift1", label: "الوردية 1" },
  { key: "shift2", label: "الوردية 2" },
  { key: "status", label: "الحالة" },
  { key: "delayMinutes", label: "دقائق التأخير" },
];

const STATUS_CLASS = {
  حضور: "bg-emerald-50 text-emerald-800",
  غياب: "bg-red-50 text-red-800",
  إجازة: "bg-amber-50 text-amber-800",
};

const CARD_CLASS =
  "rounded-md border border-gray-200 bg-white p-6 shadow-none";

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = now;
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function AttendancePage() {
  const defaults = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchAttendanceRecords({
        dateFrom,
        dateTo,
        search,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "تعذّر تحميل سجل الحضور.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError("");

    try {
      const { rows: parsedRows, errors } = await parseAttendanceCsvFile(file);

      if (errors.length > 0) {
        setError(
          `تم تجاهل ${errors.length} سطراً:\n${errors.slice(0, 3).join("\n")}${errors.length > 3 ? "\n…" : ""}`,
        );
      }

      const result = await upsertAttendanceFromCsv(parsedRows);
      await loadRecords();
      setSuccessToast(
        `تم استيراد ${result.upserted} سجل حضور بنجاح${errors.length ? ` (مع ${errors.length} تحذير)` : ""}.`,
      );
    } catch (err) {
      setError(err.message || "تعذّر استيراد الملف.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportToPayroll = async () => {
    setIsExporting(true);
    setError("");

    try {
      await exportAttendanceDeductionsToPayroll({ dateFrom, dateTo });
    } catch (err) {
      setError(err.message || "تعذّر الترحيل إلى المسير.");
    } finally {
      setIsExporting(false);
    }
  };

  const summary = useMemo(() => computeAttendanceSummary(rows), [rows]);
  const summaryEmpty = !isLoading && summary.isEmpty;
  const summaryOpts = { isLoading, isEmpty: summaryEmpty };

  return (
    <div className="md-page attendance-page">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="md-page-title">سجل الحضور والانصراف</h1>
          <p className="md-page-subtitle max-w-3xl">{SUBTITLE}</p>
        </div>
        {canManageAttendanceSettings() ? (
          <Link
            to="/dashboard/attendance/settings"
            className="md-btn-tonal inline-flex shrink-0 items-center gap-2"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            إعدادات البصمة والمواقع
          </Link>
        ) : null}
      </header>

      <section
        className={`${CARD_CLASS} space-y-4`}
        aria-label="تصفية وإجراءات"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DateInput
            label="من تاريخ"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
          />
          <DateInput
            label="إلى تاريخ"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
          />
          <div className="md:col-span-2">
            <label className="md-label mb-2 block" htmlFor="attendance-search">
              بحث (رقم وظيفي / اسم)
            </label>
            <input
              id="attendance-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="مثال: 1001 أو اسم الموظف"
              className="md-input w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={downloadAttendanceTemplateCsv}
            className="md-btn-tonal inline-flex items-center gap-2"
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden />
            تحميل القالب الافتراضي
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="md-btn-tonal inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {isImporting ? "جاري الاستيراد..." : "استيراد البصمة"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden
          />

          <button
            type="button"
            onClick={handleExportToPayroll}
            disabled={isExporting || isLoading || rows.length === 0}
            className="md-btn-primary inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            {isExporting ? "..." : "ترحيل للمسير (من صفحة المسير)"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="ملخص الفترة"
      >
        <article className={CARD_CLASS}>
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {formatSummaryStat(summary.recordCount, summaryOpts)}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">عدد السجلات</p>
        </article>
        <article className={CARD_CLASS}>
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {formatSummaryStat(summary.totalDelay, summaryOpts)}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            إجمالي دقائق التأخير
          </p>
        </article>
        <article className={CARD_CLASS}>
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {formatSummaryStat(summary.absenceCount, summaryOpts)}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">أيام غياب</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold text-slate-900"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : summaryEmpty ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row?.id ?? `attendance-${index}`}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 tabular-nums">
                      {formatGridCell(row?.employeeNumber)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatGridCell(row?.employeeName)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {formatDisplayDate(row?.recordDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {formatGridCell(row?.shift1)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {formatGridCell(row?.shift2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row?.status] ?? "bg-gray-50 text-slate-700"}`}
                      >
                        {formatGridCell(row?.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 tabular-nums">
                      {formatGridCell(row?.delayMinutes, "0")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-100 px-4 py-3 text-xs text-slate-500">
          <CalendarRange
            className="me-1 inline h-3.5 w-3.5 align-text-bottom"
            aria-hidden
          />
          للقراءة فقط — لا يمكن تعديل أو حذف السجلات من الواجهة.
        </p>
      </section>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
