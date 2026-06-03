import { useEffect, useMemo, useState } from "react";
import { Paperclip, X } from "lucide-react";
import {
  REQUEST_TYPE_OPTIONS,
  calculateMonthlyDeduction,
  createEmployeeRequest,
  uploadRequestAttachment,
} from "../../services/requestsService.js";
import { listLeaveTypes } from "../../services/catalogService.js";

const MAX_BYTES = 1048576;

const EMPTY_FORM = {
  requestType: "General",
  leaveType: "",
  details: "",
  amount: "",
  installments: "",
};

export default function NewRequestSlideover({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [attachment, setAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    listLeaveTypes()
      .then((rows) => {
        if (!cancelled) setLeaveTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setLeaveTypes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM });
    setAttachment(null);
    setFileError("");
    setSubmitError("");
    setIsSaving(false);
  }, [isOpen]);

  const monthlyDeduction = useMemo(() => {
    if (form.requestType !== "Financial") return null;
    return calculateMonthlyDeduction(form.amount, form.installments);
  }, [form.amount, form.installments, form.requestType]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setFileError("");

    if (!file) {
      setAttachment(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setAttachment(null);
      setFileError("حجم الملف يتجاوز 1 ميغابايت. يرجى اختيار ملف أصغر.");
      event.target.value = "";
      return;
    }

    setAttachment(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSubmitError("");

    try {
      let attachmentUrl = null;
      if (attachment) {
        attachmentUrl = await uploadRequestAttachment(attachment, employeeId);
      }

      const trimmedDetails = String(form.details ?? "").trim();
      const details =
        form.requestType === "Leave" && form.leaveType
          ? `نوع الإجازة: ${form.leaveType}\n${trimmedDetails}`
          : trimmedDetails;

      if (form.requestType === "Leave" && !form.leaveType) {
        throw new Error("نوع الإجازة مطلوب.");
      }

      await createEmployeeRequest({
        employeeId,
        requestType: form.requestType,
        details,
        amount: form.amount,
        installments: form.installments,
        monthlyDeduction,
        attachmentUrl,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitError(err.message || "تعذّر إرسال الطلب.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        lang="ar"
        className="relative flex h-full w-full max-w-md flex-col bg-md-surface shadow-2xl sm:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-request-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-6 py-5">
          <div className="space-y-1">
            <h2 id="new-request-title" className="text-xl font-bold text-exeer-primary">
              طلب جديد
            </h2>
            <p className="text-sm text-exeer-muted">
              يُوجّه تلقائياً حسب نوع الطلب
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <label htmlFor="request-type" className="md-label block">
                نوع الطلب
              </label>
              <select
                id="request-type"
                value={form.requestType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, requestType: e.target.value }))
                }
                disabled={isSaving}
                className="md-input"
              >
                {REQUEST_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {form.requestType === "Leave" ? (
              <div className="space-y-2">
                <label htmlFor="leave-type" className="md-label block">
                  نوع الإجازة
                </label>
                <select
                  id="leave-type"
                  value={form.leaveType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, leaveType: e.target.value }))
                  }
                  disabled={isSaving || leaveTypes.length === 0}
                  required
                  className="md-input"
                >
                  <option value="">اختر نوع الإجازة</option>
                  {leaveTypes.map((leaveType) => (
                    <option key={leaveType.id ?? leaveType.name} value={leaveType.name}>
                      {leaveType.default_days > 0
                        ? `${leaveType.name} (${leaveType.default_days} يوم)`
                        : leaveType.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {form.requestType === "Financial" ? (
              <div className="space-y-4 rounded-2xl border border-exeer-border bg-exeer-surface p-4">
                <div className="space-y-2">
                  <label htmlFor="request-amount" className="md-label block">
                    المبلغ (ر.س)
                  </label>
                  <input
                    id="request-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    disabled={isSaving}
                    required
                    className="md-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="request-installments" className="md-label block">
                    عدد الأقساط
                  </label>
                  <input
                    id="request-installments"
                    type="number"
                    min="1"
                    step="1"
                    value={form.installments}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        installments: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    className="md-input"
                  />
                </div>

                <div className="rounded-xl bg-white px-4 py-3 dark:bg-[#1e293b]">
                  <p className="text-xs text-exeer-muted">الخصم الشهري التقديري</p>
                  <p className="text-lg font-bold text-exeer-primary">
                    {monthlyDeduction != null
                      ? `${monthlyDeduction.toLocaleString("ar-SA")} ر.س`
                      : "—"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="request-details" className="md-label block">
                التفاصيل
              </label>
              <textarea
                id="request-details"
                value={form.details}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, details: e.target.value }))
                }
                disabled={isSaving}
                required
                rows={5}
                placeholder="اشرح طلبك بوضوح..."
                className="md-input min-h-[120px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="request-attachment" className="md-label block">
                مرفق (اختياري — حد أقصى 1 ميغابايت)
              </label>
              <label
                htmlFor="request-attachment"
                className="md-surface-muted flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-exeer-hover"
              >
                <Paperclip className="h-5 w-5 text-exeer-primary" aria-hidden />
                <span className="text-sm text-exeer-muted">
                  {attachment ? attachment.name : "اختر ملفاً"}
                </span>
              </label>
              <input
                id="request-attachment"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                disabled={isSaving}
                className="sr-only"
              />
              {fileError ? (
                <p className="text-sm text-red-700 dark:text-red-300">{fileError}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {submitError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-exeer-border px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="md-btn-tonal w-full sm:w-auto sm:min-w-[120px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="md-btn-primary w-full sm:w-auto sm:min-w-[160px]"
            >
              {isSaving ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
