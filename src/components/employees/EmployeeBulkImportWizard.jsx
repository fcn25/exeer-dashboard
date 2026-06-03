import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import SlideOver from "./SlideOver.jsx";
import { parseEmployeeSpreadsheet } from "../../utils/employeeBulkImport.js";
import { bulkCreateEmployees } from "../../services/employeesService.js";

export default function EmployeeBulkImportWizard({ isOpen, onClose, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sendInvites, setSendInvites] = useState(false);

  const reset = () => {
    setFile(null);
    setPreviewCount(0);
    setParsedRows([]);
    setError("");
    setIsParsing(false);
    setIsImporting(false);
    setSendInvites(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
    setPreviewCount(0);
    setParsedRows([]);

    if (!selected) return;

    setIsParsing(true);
    try {
      const rows = await parseEmployeeSpreadsheet(selected);
      setParsedRows(rows);
      setPreviewCount(rows.length);
    } catch (err) {
      setError(err.message || "تعذّر قراءة الملف.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedRows.length || isImporting) return;

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
          disabled={!parsedRows.length || isImporting || isParsing}
          className="md-btn-primary w-full"
        >
          {isImporting ? "جاري الاستيراد..." : `استيراد ${previewCount || ""} موظف`}
        </button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-md border border-dashed border-md-primary/40 bg-md-primary-container/30 p-6 text-center dark:bg-[#1e3a5f]/30">
          <FileSpreadsheet
            className="mx-auto mb-3 h-10 w-10 text-md-primary"
            aria-hidden
          />
          <p className="text-sm font-medium text-exeer-primary">
            اسحب الملف أو اختر من جهازك
          </p>
          <p className="mt-1 text-xs text-exeer-muted">
            .xlsx · .xls · .csv — يتطلب عمود الاسم الكامل
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-md-primary px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-700">
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
          </div>
        ) : null}

        {error ? (
          <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="text-xs leading-relaxed text-exeer-muted">
          <p className="font-semibold text-exeer-primary">الأعمدة المدعومة:</p>
          <p className="mt-1">
            الاسم الكامل، البريد الإلكتروني، الجوال، القسم، المسمى الوظيفي، رقم
            الموظف
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
