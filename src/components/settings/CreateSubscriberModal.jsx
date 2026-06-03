import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { signUpCompany, SIGNUP_SUCCESS_MESSAGE } from "../../services/authService.js";
import { formatErrorMessage } from "../../utils/formatErrorMessage.js";

const EMPTY_FORM = {
  companyName: "",
  adminFullName: "",
  adminEmail: "",
  password: "",
};

export default function CreateSubscriberModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccessMessage("");
    setIsSaving(false);
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await signUpCompany(form);
      setForm({ ...EMPTY_FORM });
      setSuccessMessage(result.successMessage ?? SIGNUP_SUCCESS_MESSAGE);
    } catch (err) {
      setSuccessMessage("");
      setError(formatErrorMessage(err, "تعذّر إنشاء حساب المشترك."));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-subscriber-title"
    >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="إغلاق"
            onClick={onClose}
          />

          <div className="relative max-h-[92vh] w-full max-w-xl overflow-hidden rounded-t-md bg-md-surface sm:rounded-md">
            <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-6 py-5">
              <div className="space-y-1">
                <h2
                  id="create-subscriber-title"
                  className="text-xl font-bold text-exeer-primary"
                >
                  إنشاء مشترك / عميل جديد
                </h2>
                <p className="text-sm text-exeer-muted">
                  سيتم إنشاء حساب Admin للمنشأة وإرسال رسالة تحقق عبر البريد.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(92vh-88px)] space-y-5 overflow-y-auto px-6 py-5"
            >
              <div className="space-y-2">
                <label htmlFor="subscriber-company" className="md-label block">
                  اسم المنشأة
                </label>
                <input
                  id="subscriber-company"
                  type="text"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                  className="md-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subscriber-admin-name" className="md-label block">
                  اسم المدير الكامل
                </label>
                <input
                  id="subscriber-admin-name"
                  type="text"
                  value={form.adminFullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, adminFullName: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                  className="md-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subscriber-email" className="md-label block">
                  البريد الإلكتروني
                </label>
                <input
                  id="subscriber-email"
                  type="email"
                  autoComplete="email"
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                  className="md-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subscriber-password" className="md-label block">
                  كلمة المرور
                </label>
                <input
                  id="subscriber-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                  minLength={6}
                  className="md-input"
                />
              </div>

              {successMessage ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {successMessage}
                </p>
              ) : null}

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-exeer-border pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="md-btn-tonal w-full sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="md-btn-primary w-full sm:w-auto"
                >
                  {isSaving ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}

export function CreateSubscriberButton({ className = "md-btn-primary" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 ${className}`}
      >
        <Plus className="h-4 w-4" aria-hidden />
        إنشاء مشترك / عميل جديد
      </button>
      <CreateSubscriberModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
