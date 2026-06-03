import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import SlideOver from "./SlideOver.jsx";
import EmployeeFormSections from "./EmployeeFormSections.jsx";
import SuccessToast from "../ui/SuccessToast.jsx";
import { EMPTY_EMPLOYEE_FORM } from "./employeeFormShared.js";
import { createEmployee, bulkCreateEmployees } from "../../services/employeesService.js";
import {
  downloadEmployeeCsvTemplate,
  parseEmployeeImportFile,
  validateEmployeeImportRows,
} from "../../utils/employeeBulkImport.js";

const TAB_SINGLE = "single";
const TAB_BULK = "bulk";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-gray-200 bg-white text-slate-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function SingleEmployeePanel({
  form,
  onChange,
  onSubmit,
  departmentOptions,
  jobTitleOptions,
  error,
  successMessage,
}) {
  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </p>
      ) : null}

      <form id="add-employee-form" onSubmit={onSubmit}>
        <EmployeeFormSections
          form={form}
          onChange={onChange}
          departmentOptions={departmentOptions}
          jobTitleOptions={jobTitleOptions}
        />
      </form>
    </div>
  );
}

function BulkUploadPanel({
  parsedRows,
  previewCount,
  fileName,
  isParsing,
  isUploading,
  error,
  validationErrors,
  onDownloadTemplate,
  onFileSelected,
  onStartUpload,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files) => {
      const selected = files?.[0] ?? null;
      if (selected) onFileSelected(selected);
    },
    [onFileSelected],
  );

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer?.files);
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onDownloadTemplate}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-gray-50"
      >
        <Download className="h-4 w-4" aria-hidden />
        تحميل القالب الافتراضي
      </button>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`rounded-md border border-dashed px-4 py-10 text-center transition-colors ${
          isDragging
            ? "border-slate-900 bg-gray-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden />
        <p className="text-sm font-medium text-slate-900">
          اسحب وأفلت الملف هنا بعد تعبئته، أو اضغط للاستعراض
        </p>
        <p className="mt-1 text-xs text-slate-500">
          CSV أو Excel — الأعمدة: Full Name, Email, Phone, Department, Job Title, Role
        </p>
        <label
          htmlFor={inputId}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          استعراض الملف
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={isParsing || isUploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {isParsing ? (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          جاري تحليل الملف...
        </div>
      ) : null}

      {previewCount > 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            {previewCount} موظف جاهز للرفع
          </p>
          {fileName ? (
            <p className="mt-1 text-xs text-slate-500">{fileName}</p>
          ) : null}
        </div>
      ) : null}

      {validationErrors?.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">صفوف غير صالحة ({validationErrors.length})</p>
          <ul className="mt-2 list-inside list-disc text-xs">
            {validationErrors.slice(0, 5).map((item) => (
              <li key={`${item.rowNumber}-${item.full_name}`}>
                صف {item.rowNumber}: {item.full_name} — {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onStartUpload}
        disabled={!parsedRows.length || isParsing || isUploading}
        className="md-btn-primary flex w-full items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            جاري الرفع...
          </>
        ) : (
          "بدء الرفع"
        )}
      </button>
    </div>
  );
}

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onCreated,
  initialTab = TAB_SINGLE,
  departmentOptions = [],
  jobTitleOptions = [],
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const [form, setForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [singleError, setSingleError] = useState("");
  const [singleSuccess, setSingleSuccess] = useState("");

  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [bulkError, setBulkError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [toastMessage, setToastMessage] = useState("");

  const resetBulk = () => {
    setFile(null);
    setParsedRows([]);
    setValidationErrors([]);
    setPreviewCount(0);
    setBulkError("");
    setIsParsing(false);
    setIsUploading(false);
  };

  const resetAll = () => {
    setForm({ ...EMPTY_EMPLOYEE_FORM });
    setIsSaving(false);
    setSingleError("");
    setSingleSuccess("");
    resetBulk();
    setActiveTab(TAB_SINGLE);
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab === TAB_BULK ? TAB_BULK : TAB_SINGLE);
    setForm({ ...EMPTY_EMPLOYEE_FORM });
    setSingleError("");
    setSingleSuccess("");
    resetBulk();
  }, [isOpen, initialTab]);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleSingleSave = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim()) {
      setSingleError("الاسم الكامل مطلوب.");
      return;
    }
    if (!form.email?.trim()) {
      setSingleError("البريد الإلكتروني مطلوب لإرسال دعوة الدخول للموظف.");
      return;
    }

    setIsSaving(true);
    setSingleError("");
    setSingleSuccess("");

    try {
      const created = await createEmployee(form);
      await onCreated?.();
      if (created.invitationSent) {
        setSingleSuccess(
          `تم حفظ الموظف وإرسال دعوة الدخول إلى ${form.email.trim()}.`,
        );
        setTimeout(handleClose, 1400);
        return;
      }
      setToastMessage("تم إضافة الموظف بنجاح!");
      handleClose();
    } catch (err) {
      setSingleError(err.message || "تعذّر إضافة الموظف.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelected = async (selected) => {
    setFile(selected);
    setBulkError("");
    setParsedRows([]);
    setValidationErrors([]);
    setPreviewCount(0);

    if (!selected) return;

    setIsParsing(true);
    try {
      const rows = await parseEmployeeImportFile(selected);
      const { valid, invalid } = validateEmployeeImportRows(rows);
      setParsedRows(valid);
      setValidationErrors(invalid);
      setPreviewCount(valid.length);

      if (valid.length === 0) {
        setBulkError(
          invalid.length > 0
            ? "خطأ في بعض السجلات، يرجى التأكد من صحة البريد الإلكتروني."
            : "لم يتم العثور على موظفين صالحين في الملف.",
        );
      }
    } catch (err) {
      setBulkError(err.message || "تعذّر قراءة الملف.");
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedRows.length || isUploading) return;

    setIsUploading(true);
    setBulkError("");

    try {
      const result = await bulkCreateEmployees(parsedRows);

      await onCreated?.();

      if (result.partial) {
        setBulkError(
          `تم إضافة ${result.imported} موظف. خطأ في بعض السجلات، يرجى التأكد من صحة البريد الإلكتروني.`,
        );
        setToastMessage(`تم إضافة ${result.imported} موظف بنجاح`);
      } else {
        setToastMessage("تم إضافة جميع الموظفين بنجاح!");
        handleClose();
      }
    } catch (err) {
      setBulkError(err.message || "تعذّر رفع الموظفين.");
    } finally {
      setIsUploading(false);
    }
  };

  const footer =
    activeTab === TAB_SINGLE ? (
      <button
        type="submit"
        form="add-employee-form"
        disabled={isSaving}
        className="md-btn-primary w-full"
      >
        {isSaving ? "جاري الحفظ..." : "حفظ الموظف"}
      </button>
    ) : null;

  return (
    <>
      <SuccessToast
        message={toastMessage}
        onDismiss={() => setToastMessage("")}
      />

      <SlideOver
        isOpen={isOpen}
        onClose={handleClose}
        title="إضافة موظفين"
        subtitle="موظف فردي أو رفع جماعي عبر القالب"
        footer={footer}
      >
        <div className="mb-6 flex gap-2">
          <TabButton
            active={activeTab === TAB_SINGLE}
            onClick={() => setActiveTab(TAB_SINGLE)}
          >
            إضافة موظف فردي
          </TabButton>
          <TabButton
            active={activeTab === TAB_BULK}
            onClick={() => setActiveTab(TAB_BULK)}
          >
            المعالج الذكي للرفع المتعدد
          </TabButton>
        </div>

        {activeTab === TAB_SINGLE ? (
          <SingleEmployeePanel
            form={form}
            onChange={setForm}
            onSubmit={handleSingleSave}
            departmentOptions={departmentOptions}
            jobTitleOptions={jobTitleOptions}
            error={singleError}
            successMessage={singleSuccess}
          />
        ) : (
          <BulkUploadPanel
            parsedRows={parsedRows}
            previewCount={previewCount}
            fileName={file?.name}
            isParsing={isParsing}
            isUploading={isUploading}
            error={bulkError}
            validationErrors={validationErrors}
            onDownloadTemplate={downloadEmployeeCsvTemplate}
            onFileSelected={handleFileSelected}
            onStartUpload={handleBulkUpload}
          />
        )}
      </SlideOver>
    </>
  );
}

export { TAB_BULK, TAB_SINGLE };
