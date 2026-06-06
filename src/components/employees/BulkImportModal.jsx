import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Upload, UploadCloud, X } from "lucide-react";
import SlideOver from "./SlideOver.jsx";
import {
  EMPLOYEE_IMPORT_TEMPLATE_COLUMNS_AR,
  EMPLOYEE_IMPORT_TEMPLATE_FILE,
  isValidEmployeeEmail,
  parseEmployeeSpreadsheet,
} from "../../utils/employeeBulkImport.js";
import {
  buildBulkImportLimitMessage,
  canAddEmployeeCount,
} from "../../utils/employeeLimitGuard.js";
import { fetchEmployeeLimitContext } from "../../services/employeeLimitService.js";
import { bulkCreateEmployees } from "../../services/employeesService.js";

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState("");
  const [limitError, setLimitError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sendInvites, setSendInvites] = useState(false);
  const [limitContext, setLimitContext] = useState({
    tier: "trial",
    employeeCount: 0,
  });

  const reset = () => {
    setFile(null);
    setPreviewCount(0);
    setParsedRows([]);
    setError("");
    setLimitError("");
    setIsParsing(false);
    setIsImporting(false);
    setSendInvites(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const ctx = await fetchEmployeeLimitContext();
        if (!cancelled) setLimitContext(ctx);
      } catch {
        if (!cancelled) setLimitContext({ tier: "trial", employeeCount: 0 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const importBlocked = useMemo(() => {
    if (!parsedRows.length) return false;
    return !canAddEmployeeCount(
      limitContext.employeeCount,
      parsedRows.length,
      limitContext.tier,
    ).allowed;
  }, [limitContext.employeeCount, limitContext.tier, parsedRows.length]);

  const rowsMissingEmail = useMemo(
    () => parsedRows.filter((row) => !isValidEmployeeEmail(row.email)).length,
    [parsedRows],
  );

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
    setLimitError("");
    setPreviewCount(0);
    setParsedRows([]);

    if (!selected) return;

    setIsParsing(true);
    try {
      const rows = await parseEmployeeSpreadsheet(selected);
      setParsedRows(rows);
      setPreviewCount(rows.length);
      setLimitError(
        buildBulkImportLimitMessage({
          currentCount: limitContext.employeeCount,
          importCount: rows.length,
          tier: limitContext.tier,
        }) ?? "",
      );
    } catch (err) {
      setError(err.message || "تعذّر قراءة الملف.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setIsParsing(false);
    }
  };

  useEffect(() => {
    if (!parsedRows.length) {
      setLimitError("");
      return;
    }
    setLimitError(
      buildBulkImportLimitMessage({
        currentCount: limitContext.employeeCount,
        importCount: parsedRows.length,
        tier: limitContext.tier,
      }) ?? "",
    );
  }, [limitContext.employeeCount, limitContext.tier, parsedRows.length]);

  const handleImport = async () => {
    if (!parsedRows.length || isImporting || importBlocked) return;

    setIsImporting(true);
    setError("");

    try {
      const result = await bulkCreateEmployees(parsedRows, { sendInvites });
      onSuccess?.(result);
      handleClose();
    } catch (err) {
      setError(err.message || "تعذّر استيراد الموظفين.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={handleClose}
      title="المعالج الذكي للبيانات"
      subtitle="ارفع ملف Excel أو CSV لإضافة فريقك دفعة واحدة"
      footer={
        <button
          type="button"
          onClick={handleImport}
          disabled={
            !parsedRows.length || isImporting || isParsing || importBlocked
          }
          className="md-btn-primary w-full"
        >
          {isImporting ? "جاري الاستيراد..." : `استيراد ${previewCount || ""} موظف`}
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-md-primary/40 bg-md-primary-container/30 p-6 text-center dark:bg-[#1e3a5f]/30">
          <UploadCloud
            className="h-10 w-10 text-md-primary"
            aria-hidden
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-exeer-primary">
              اسحب الملف أو اختر من جهازك
            </p>
            <p className="text-xs text-exeer-muted">
              .xlsx · .xls · .csv — استخدم نموذج {EMPLOYEE_IMPORT_TEMPLATE_FILE}
            </p>
          </div>
          <a
            href={`/${EMPLOYEE_IMPORT_TEMPLATE_FILE}`}
            download={EMPLOYEE_IMPORT_TEMPLATE_FILE}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            تحميل نموذج البيانات الافتراضي
          </a>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-md-primary px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-700">
            <Upload className="h-4 w-4" aria-hidden />
            اختيار ملف
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isParsing || isImporting}
              className="sr-only"
            />
          </label>
        </div>

        {isParsing ? (
          <div className="flex items-center justify-center gap-2 text-sm text-exeer-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            جاري تحليل الملف...
          </div>
        ) : null}

        {file && previewCount > 0 ? (
          <div className="md-surface-muted space-y-3 p-4">
            <p className="text-sm font-semibold text-exeer-primary">
              جاهز للاستيراد: {previewCount} موظف
            </p>
            <p className="text-xs text-exeer-muted">{file.name}</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-exeer-primary">
              <input
                type="checkbox"
                checked={sendInvites}
                onChange={(e) => setSendInvites(e.target.checked)}
                disabled={isImporting}
                className="h-4 w-4 rounded border-exeer-border"
              />
              إرسال دعوات الدخول للبريد الإلكتروني (إن وُجد)
            </label>
            {sendInvites && rowsMissingEmail > 0 ? (
              <p className="text-xs text-amber-800">
                {rowsMissingEmail} موظف بدون بريد صالح — سيُستوردون دون دعوة
                دخول.
              </p>
            ) : null}
          </div>
        ) : null}

        {limitError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {limitError}
          </p>
        ) : null}

        {error ? (
          <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="text-xs leading-relaxed text-exeer-muted">
          <p className="font-semibold text-exeer-primary">
            أعمدة نموذج {EMPLOYEE_IMPORT_TEMPLATE_FILE}:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            {EMPLOYEE_IMPORT_TEMPLATE_COLUMNS_AR.map((column) => (
              <li key={column}>{column}</li>
            ))}
          </ul>
          <p className="mt-2">
            يُربط موقع العمل تلقائياً باسم الفرع إن وُجد في إعدادات البصمة.
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
