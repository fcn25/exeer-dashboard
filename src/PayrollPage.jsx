import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Lock, Printer } from "lucide-react";
import { MonthInput } from "./components/ui/DateInput.jsx";
import {
  exportPayrollMonth,
  fetchPayrollForMonth,
  generatePayrollForMonth,
  PAYROLL_SCHEMA_FIX_HINT,
} from "./services/payrollService.js";
import {
  computePayrollStats,
  formatPayrollMonthFromPicker,
} from "./utils/payroll/calculations.js";
import { downloadPayrollCsv } from "./utils/payroll/exportPayroll.js";

const TABLE_COLUMNS = [
  { key: "employeeName", label: "اسم الموظف", tone: "neutral" },
  { key: "basic", label: "الأساسي", tone: "neutral" },
  { key: "housing", label: "السكن", tone: "neutral" },
  { key: "allowances", label: "البدلات", tone: "addition" },
  { key: "commissions", label: "العمولات", tone: "addition" },
  { key: "additional", label: "الإضافي", tone: "addition" },
  { key: "penalties", label: "جزاءات", tone: "deduction" },
  { key: "gosi", label: "GOSI", tone: "deduction" },
  { key: "lateness", label: "تأخيرات", tone: "deduction" },
  { key: "net", label: "الصافي", tone: "neutral" },
];

const HEADER_TONE_CLASS = {
  neutral: "bg-gray-50 text-slate-900",
  addition: "bg-emerald-50 text-emerald-800",
  deduction: "bg-red-50 text-red-800",
};

const DEDUCTION_KEYS = new Set(["penalties", "gosi", "lateness"]);

function formatCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-md border border-gray-200 bg-white p-5 shadow-none">
      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-slate-500">{label}</p>
    </article>
  );
}

function ExportConfirmModal({
  isOpen,
  payrollMonthLabel,
  onCancel,
  onConfirm,
  isExporting,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-md border border-gray-200 bg-white p-6 shadow-none">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">تأكيد التصدير</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          هل أنت متأكد من تصدير مسير رواتب شهر{" "}
          <span className="font-semibold text-slate-900">{payrollMonthLabel}</span>
          ؟ سيتم قفل السجلات بعد التصدير ولن يمكن إعادة إنشاء المسير لهذا الشهر.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className="md-btn-tonal flex-1"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            className="md-btn-primary flex-1"
          >
            {isExporting ? "جاري التصدير..." : "تأكيد التصدير"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [rows, setRows] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [schemaWarning, setSchemaWarning] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
      setIsLocked(result.isLocked);
      setSchemaWarning(result.schemaWarning ?? "");
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || "تعذّر تحميل المسير.");
      if (
        String(err.message ?? "").includes("payroll_month") ||
        String(err.message ?? "").includes(PAYROLL_SCHEMA_FIX_HINT)
      ) {
        setSchemaWarning(PAYROLL_SCHEMA_FIX_HINT);
      }
      setRows([]);
      setIsLocked(false);
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
    if (!selectedMonth || isLocked) return;

    setIsLoading(true);
    setError("");
    setSchemaWarning("");
    setSuccessMessage("");

    try {
      const result = await generatePayrollForMonth(selectedMonth);
      setRows(result.rows);
      setIsLocked(result.isLocked);
      setSchemaWarning(result.schemaWarning ?? "");
      setHasLoaded(true);
      setSuccessMessage(
        result.rows.length > 0
          ? `تم إنشاء مسير ${payrollMonthLabel} — ${formatCount(result.rows.length)} موظف`
          : "لا يوجد موظفون نشطون لإدراجهم في المسير",
      );
    } catch (err) {
      setError(err.message || "تعذّر إنشاء المسير.");
      if (String(err.message ?? "").includes("payroll_month")) {
        setSchemaWarning(PAYROLL_SCHEMA_FIX_HINT);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmExport = async () => {
    setIsExporting(true);
    setError("");

    try {
      const result = await exportPayrollMonth(selectedMonth);
      downloadPayrollCsv(result.rows, result.payrollMonth);
      setRows(result.rows);
      setIsLocked(true);
      setIsExportModalOpen(false);
      setSuccessMessage("تم تصدير المسير وقفل السجلات بنجاح");
    } catch (err) {
      setError(err.message || "تعذّر تصدير المسير.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summaryReady = hasLoaded && !isLoading;

  return (
    <div className="md-page">
      <header className="no-print space-y-2">
        <h1 className="md-page-title">مسير الرواتب</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
          مسير الرواتب المعتمد — أداة عملية لتوليد الكشوفات المالية نهاية كل شهر،
          وتصديرها لمشاركتها مع الإدارة المالية.
        </p>
      </header>

      <div id="payroll-print-area" className="space-y-6">
        <div className="print-only mb-4 hidden border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold text-slate-900">مسير الرواتب</h1>
          <p className="text-sm text-slate-600">الشهر: {payrollMonthLabel}</p>
        </div>

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          aria-label="ملخص المسير"
        >
          <StatCard
            label="عدد الموظفين"
            value={summaryReady ? formatCount(stats.employeeCount) : "—"}
          />
          <StatCard
            label="إجمالي الخصومات"
            value={
              summaryReady ? formatCurrency(stats.totalDeductions) : "—"
            }
          />
          <StatCard
            label="إجمالي صافي الرواتب"
            value={summaryReady ? formatCurrency(stats.totalNet) : "—"}
          />
        </section>

        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr>
                  {TABLE_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold ${HEADER_TONE_CLASS[column.tone]}`}
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
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                ) : !hasLoaded || rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COLUMNS.length}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      {hasLoaded
                        ? "لا توجد سجلات — اضغط «إنشاء المسير الشهري»"
                        : "اختر الشهر ثم أنشئ المسير"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-200 transition-colors last:border-b-0 hover:bg-gray-50/80"
                    >
                      {TABLE_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 text-center tabular-nums ${
                            DEDUCTION_KEYS.has(column.key)
                              ? "font-medium text-red-700"
                              : "text-slate-800"
                          }`}
                        >
                          {column.key === "employeeName"
                            ? row.employeeName
                            : formatCurrency(row[column.key])}
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

      <div className="no-print space-y-4">
        {isLocked ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            مسير شهر {payrollMonthLabel} مُصدَّر ومقفل — لا يمكن إعادة الإنشاء
          </div>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
            {successMessage}
          </p>
        ) : null}

        {schemaWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {schemaWarning}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-5 shadow-none lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <MonthInput
              id="payroll-month"
              label="الشهر / السنة"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isLoading || isExporting}
              className="min-w-[220px]"
            />

            <button
              type="button"
              onClick={handleGeneratePayroll}
              disabled={isLoading || isExporting || !selectedMonth || isLocked}
              className="md-btn-primary"
            >
              {isLoading ? "جاري المعالجة..." : "إنشاء المسير الشهري"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              disabled={rows.length === 0 || isExporting}
              className="md-btn-tonal inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              تصدير Excel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={rows.length === 0}
              className="md-btn-tonal inline-flex items-center gap-2"
            >
              <Printer className="h-4 w-4" aria-hidden />
              طباعة
            </button>
          </div>
        </section>
      </div>

      <ExportConfirmModal
        isOpen={isExportModalOpen}
        payrollMonthLabel={payrollMonthLabel}
        onCancel={() => setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        isExporting={isExporting}
      />

      <style>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff !important; }
          aside, nav, .no-print, button { display: none !important; }
          .print-only { display: block !important; }
          #payroll-print-area {
            position: static;
            width: 100%;
            border: none;
            box-shadow: none;
          }
          #payroll-print-area table { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
