import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  FileSpreadsheet,
  History,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import {
  fetchPayrollForMonth,
  fetchPayrollHistorySummaries,
  fetchPayrollHistoryYears,
} from "../../services/payrollService.js";
import { fetchPayrollAccountingRows } from "../../services/payrollSyncService.js";
import { formatPayrollMonthFromPicker } from "../../utils/payroll/calculations.js";
import { downloadPayrollAccountingExcel } from "../../utils/payroll/exportPayrollAccountingExcel.js";
import {
  ARABIC_MONTHS,
  formatPayrollCurrency,
  PAYROLL_DEDUCTION_KEYS,
  PAYROLL_DETAIL_COLUMNS,
  PAYROLL_HEADER_TONE_CLASS,
} from "../../utils/payroll/payrollTableConfig.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";

function formatCreatedAt(value) {
  return formatLocaleDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatusLabel(status) {
  return status === "exported" ? "exported" : "draft";
}

function PayrollDetailTable({ rows, tableClassName = "payroll-history-print-table" }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`${tableClassName} w-full min-w-[1100px] border-collapse text-sm`}
      >
        <thead>
          <tr>
            {PAYROLL_DETAIL_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold ${PAYROLL_HEADER_TONE_CLASS[column.tone]}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-200 hover:bg-gray-50/80"
            >
              {PAYROLL_DETAIL_COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-center tabular-nums ${
                    PAYROLL_DEDUCTION_KEYS.has(column.key)
                      ? "font-medium text-red-700"
                      : "text-slate-800"
                  }`}
                >
                  {column.key === "employeeName"
                    ? row.employeeName
                    : formatPayrollCurrency(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayrollHistoryModal({ isOpen, onClose }) {
  const [years, setYears] = useState([]);
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [detailRows, setDetailRows] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = useCallback(() => {
    setViewMode("list");
    setSelectedSummary(null);
    setDetailRows([]);
    setError("");
  }, []);

  const loadSummaries = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError("");

    try {
      const rows = await fetchPayrollHistorySummaries(filters);
      setSummaries(rows);
    } catch (err) {
      setError(err.message || "تعذّر تحميل سجل المسيرات.");
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function init() {
      resetState();
      setIsLoading(true);
      setError("");

      try {
        const [availableYears, allSummaries] = await Promise.all([
          fetchPayrollHistoryYears(),
          fetchPayrollHistorySummaries(),
        ]);
        if (cancelled) return;

        setYears(availableYears);
        setFilterYear(
          availableYears.length ? String(availableYears[0]) : "",
        );
        setFilterMonth("");
        setSummaries(allSummaries);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل سجل المسيرات.");
          setSummaries([]);
          setYears([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleApplyFilters = async () => {
    await loadSummaries({
      year: filterYear || undefined,
      month: filterMonth || undefined,
    });
    setViewMode("list");
    setSelectedSummary(null);
    setDetailRows([]);
  };

  const handleOpenSummary = async (summary) => {
    setIsDetailLoading(true);
    setError("");

    try {
      const result = await fetchPayrollForMonth(summary.pickerValue);
      setSelectedSummary(summary);
      setDetailRows(result.rows);
      setViewMode("detail");
    } catch (err) {
      setError(err.message || "تعذّر فتح تفاصيل المسير.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedSummary(null);
    setDetailRows([]);
  };

  const handlePrintDetail = () => {
    document.body.classList.add("printing-payroll-history");

    const cleanup = () => {
      document.body.classList.remove("printing-payroll-history");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const handleExportDetail = async () => {
    if (!selectedSummary) return;

    setError("");
    try {
      const records = await fetchPayrollAccountingRows(selectedSummary.pickerValue);
      downloadPayrollAccountingExcel(
        records,
        formatPayrollMonthFromPicker(selectedSummary.pickerValue),
      );
    } catch (err) {
      setError(err.message || "تعذّر تصدير ملف Excel.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payroll-history-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-md border border-gray-200 bg-white shadow-none sm:max-h-[90vh] sm:rounded-md"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 px-5 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <History className="h-6 w-6" aria-hidden />
              </span>
              <div className="space-y-1">
                <h2
                  id="payroll-history-title"
                  className="text-xl font-bold text-slate-900 sm:text-2xl"
                >
                  سجل المسيرات السابقة
                </h2>
                <p className="text-sm text-slate-500">
                  عرض للقراءة فقط — لا يمكن تعديل المسيرات من هنا
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-slate-500 transition-colors hover:bg-gray-50"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <section className="mb-6 flex flex-col gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <label
                htmlFor="history-filter-year"
                className="mb-2 block text-sm font-medium text-slate-900"
              >
                السنة
              </label>
              <select
                id="history-filter-year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="md-input w-full"
                disabled={isLoading}
              >
                <option value="">كل السنوات</option>
                {years.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <label
                htmlFor="history-filter-month"
                className="mb-2 block text-sm font-medium text-slate-900"
              >
                الشهر
              </label>
              <select
                id="history-filter-month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="md-input w-full"
                disabled={isLoading}
              >
                {ARABIC_MONTHS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="md-btn-primary shadow-none"
            >
              عرض المسير
            </button>
          </section>

          {error ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          {viewMode === "list" ? (
            <section className="overflow-hidden rounded-md border border-gray-200">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2
                    className="h-8 w-8 animate-spin text-slate-700"
                    aria-hidden
                  />
                  <p className="text-sm text-slate-500">جاري التحميل...</p>
                </div>
              ) : summaries.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm text-slate-500">
                  لا توجد مسيرات سابقة للفلاتر المحددة
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-slate-900">
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          الشهر / السنة
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          عدد الموظفين
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          إجمالي الصافي
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          الحالة
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          تاريخ الإنشاء
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold">
                          إجراء
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((summary) => (
                        <tr
                          key={summary.payrollMonth}
                          className="border-b border-gray-200 hover:bg-gray-50/80"
                        >
                          <td className="px-4 py-3 text-center text-slate-800">
                            {summary.payrollMonth}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-800">
                            {summary.employeeCount}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-800">
                            {formatPayrollCurrency(summary.totalNet)}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-800">
                            {formatStatusLabel(summary.status)}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {formatCreatedAt(summary.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenSummary(summary)}
                              disabled={isDetailLoading}
                              className="md-btn-tonal px-3 py-1.5 text-xs disabled:opacity-50"
                            >
                              فتح
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  رجوع إلى السجل
                </button>
                <p className="text-sm font-medium text-slate-700">
                  مسير {selectedSummary?.payrollMonth}
                </p>
              </div>

              {isDetailLoading ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2
                    className="h-8 w-8 animate-spin text-slate-700"
                    aria-hidden
                  />
                  <p className="text-sm text-slate-500">جاري تحميل التفاصيل...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <PayrollDetailTable rows={detailRows} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handlePrintDetail}
                      disabled={detailRows.length === 0}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      طباعة / حفظ PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDetail}
                      disabled={detailRows.length === 0}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" aria-hidden />
                      تصدير Excel
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body:not(.printing-payroll-history) * {
            visibility: hidden;
          }
          .payroll-history-print-table,
          .payroll-history-print-table * {
            visibility: visible;
          }
          .payroll-history-print-table {
            position: absolute;
            right: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
