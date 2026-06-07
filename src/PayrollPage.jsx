import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, History, Lock, Printer, RefreshCw } from "lucide-react";
import PayrollHistoryModal from "./components/payroll/PayrollHistoryModal.jsx";
import { MonthInput } from "./components/ui/DateInput.jsx";
import {
  exportPayrollMonth,
  fetchPayrollForMonth,
  generatePayrollForMonth,
} from "./services/payrollService.js";
import {
  fetchPayrollAccountingRows,
  syncPayrollDeductionsForMonth,
} from "./services/payrollSyncService.js";
import {
  computePayrollStats,
  formatPayrollMonthFromPicker,
} from "./utils/payroll/calculations.js";
import { downloadPayrollAccountingExcel } from "./utils/payroll/exportPayrollAccountingExcel.js";
import {
  formatPayrollCurrency,
  PAYROLL_DEDUCTION_KEYS,
  PAYROLL_DETAIL_COLUMNS,
  PAYROLL_HEADER_TONE_CLASS,
  safePayrollAmount,
} from "./utils/payroll/payrollTableConfig.js";
import ExeerEmptyState from "./components/brand/ExeerEmptyState.jsx";

const PAYROLL_SUBTITLE =
  "بروتوكول المزامنة الآمن — أنشئ المسير ثم حدّث الخصومات عند الطلب (حضور، إجراءات إدارية، قروض) قبل تصدير ملف المحاسبة.";

const CARD_CLASS =
  "rounded-md border border-gray-200 bg-white p-6 shadow-none";

function formatStatCount(value) {
  return safePayrollAmount(value);
}

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function StatCard({ label, value }) {
  return (
    <article className={CARD_CLASS}>
      <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
    </article>
  );
}

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [rows, setRows] = useState([]);
  const [isExported, setIsExported] = useState(false);
  const [hasExistingPayroll, setHasExistingPayroll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [schemaWarning, setSchemaWarning] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const payrollMonthLabel = formatPayrollMonthFromPicker(selectedMonth);
  const stats = useMemo(() => computePayrollStats(rows), [rows]);

  const loadPayroll = useCallback(async () => {
    if (!selectedMonth) return;

    setIsLoading(true);
    setError("");
    setSchemaWarning("");

    try {
      const result = await fetchPayrollForMonth(selectedMonth);
      setRows(result.rows);
      setIsExported(result.isExported);
      setHasExistingPayroll(result.hasRecords);
      setSchemaWarning(result.schemaWarning ?? "");
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || "تعذّر تحميل المسير.");
      setRows([]);
      setIsExported(false);
      setHasExistingPayroll(false);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleGeneratePayroll = async () => {
    if (!selectedMonth || hasExistingPayroll) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await generatePayrollForMonth(selectedMonth);
      setRows(result.rows);
      setIsExported(result.isExported);
      setHasExistingPayroll(result.hasRecords);
      setSchemaWarning(result.schemaWarning ?? "");
      setHasLoaded(true);
      setSuccessMessage("تم إنشاء مسير الشهر بنجاح");
    } catch (err) {
      setError(err.message || "تعذّر إنشاء المسير.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncDeductions = async () => {
    if (!selectedMonth || rows.length === 0) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await syncPayrollDeductionsForMonth(selectedMonth);
      await loadPayroll();
      setSuccessMessage(
        `تم تحديث أرقام المسير لشهر ${result.payrollMonth} — ${result.updatedCount} موظف`,
      );
    } catch (err) {
      setError(err.message || "تعذّر تحديث أرقام المسير.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAccounting = async () => {
    if (!selectedMonth || rows.length === 0) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const records = await fetchPayrollAccountingRows(selectedMonth);
      downloadPayrollAccountingExcel(records, payrollMonthLabel);
      await exportPayrollMonth(selectedMonth);
      await loadPayroll();
      setSuccessMessage("تم تصدير ملف المحاسبة وتحديث حالة المسير إلى exported");
    } catch (err) {
      setError(err.message || "تعذّر تصدير ملف المحاسبة.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-payroll");

    const cleanup = () => {
      document.body.classList.remove("printing-payroll");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const statsReady = hasLoaded && !isLoading;

  return (
    <div className="md-page payroll-page">
      <header className="payroll-no-print space-y-2">
        <h1 className="md-page-title">مسير الرواتب</h1>
        <p className="text-sm text-slate-500">{PAYROLL_SUBTITLE}</p>
      </header>

      <div className="payroll-no-print space-y-4">
        {isExported ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-none">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            مسير شهر {payrollMonthLabel} مُصدَّر — يمكن تحديث الأرقام أو إعادة التصدير
          </div>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800 shadow-none">
            {successMessage}
          </p>
        ) : null}

        {schemaWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-none">
            {schemaWarning}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-none">
            {error}
          </p>
        ) : null}

        <section
          className={`${CARD_CLASS} flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <MonthInput
              id="payroll-month"
              label="الشهر / السنة"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isLoading}
              className="min-w-[220px]"
            />

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleGeneratePayroll}
                disabled={isLoading || !selectedMonth || hasExistingPayroll}
                className="md-btn-primary shadow-none"
              >
                {isLoading ? "جاري المعالجة..." : "إنشاء المسير الشهري"}
              </button>
              {hasExistingPayroll ? (
                <p className="text-xs text-slate-500">تم إنشاء مسير هذا الشهر</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSyncDeductions}
              disabled={isLoading || !selectedMonth || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
              title="مزامنة التأخيرات والجزاءات والقروض للشهر المعروض"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              تحديث أرقام المسير
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50"
            >
              <History className="h-4 w-4" aria-hidden />
              سجل المسيرات
            </button>
            <button
              type="button"
              onClick={handleExportAccounting}
              disabled={isLoading || !selectedMonth || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-none hover:bg-slate-800 disabled:opacity-50"
              title="تصدير Excel للمحاسبة (يشمل البنك والآيبان — غير معروض في الجدول)"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              تصدير للمحاسبة
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden />
              طباعة
            </button>
          </div>
        </section>
      </div>

      <div id="payroll-print-area" className="space-y-6">
        <section
          className="payroll-no-print grid grid-cols-1 gap-5 sm:grid-cols-3"
          aria-label="ملخص المسير"
        >
          <StatCard
            label="عدد الموظفين"
            value={statsReady ? formatStatCount(stats.employeeCount) : "—"}
          />
          <StatCard
            label="إجمالي الخصومات"
            value={
              statsReady ? formatPayrollCurrency(stats.totalDeductions) : "—"
            }
          />
          <StatCard
            label="إجمالي صافي الرواتب"
            value={statsReady ? formatPayrollCurrency(stats.totalNet) : "—"}
          />
        </section>

        <section className={`${CARD_CLASS} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="payroll-table w-full min-w-[1100px] border-collapse text-sm shadow-none">
              <thead>
                <tr>
                  {PAYROLL_DETAIL_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold shadow-none ${PAYROLL_HEADER_TONE_CLASS[column.tone]}`}
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
                      colSpan={PAYROLL_DETAIL_COLUMNS.length}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                ) : !hasLoaded || rows.length === 0 ? (
                  <tr>
                    <td colSpan={PAYROLL_DETAIL_COLUMNS.length} className="p-0">
                      <ExeerEmptyState
                        message={
                          hasLoaded
                            ? "لا توجد سجلات — اضغط «إنشاء المسير الشهري»"
                            : "اختر الشهر ثم أنشئ المسير"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PayrollHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body:not(.printing-payroll) * {
            visibility: hidden;
          }
          .payroll-table,
          .payroll-table * {
            visibility: visible;
          }
          .payroll-table {
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
