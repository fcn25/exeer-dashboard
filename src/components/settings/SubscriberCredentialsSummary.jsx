import { Download, X } from "lucide-react";

function buildCredentialsText(summary) {
  return [
    "Exeer — بيانات حساب المشترك",
    "================================",
    "",
    `اسم المنشأة: ${summary.companyName}`,
    `اسم المدير: ${summary.adminFullName}`,
    `البريد الإلكتروني: ${summary.adminEmail}`,
    `كلمة المرور: ${summary.password}`,
    "",
    "ملاحظات:",
    "- تم إرسال رسالة تحقق/ترحيب إلى البريد الإلكتروني أعلاه.",
    "- يرجى حفظ هذه البيانات في مكان آمن.",
    `- تاريخ الإنشاء: ${summary.createdAtLabel}`,
    "",
  ].join("\n");
}

export function downloadSubscriberCredentials(summary) {
  const text = buildCredentialsText(summary);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `exeer-subscriber-${Date.now()}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SubscriberCredentialsSummary({
  summary,
  onClose,
}) {
  if (!summary) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscriber-credentials-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-t-md bg-md-surface p-6 sm:rounded-md sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="subscriber-credentials-title"
              className="text-xl font-bold text-exeer-primary"
            >
              تم إنشاء حساب المشترك
            </h2>
            <p className="text-sm text-exeer-muted">
              تم إرسال رسالة تحقق إلى البريد الإلكتروني. احفظ بيانات الدخول
              أدناه للرجوع إليها.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="md-surface-muted space-y-3 rounded-md p-5 text-sm">
          <p>
            <span className="font-semibold text-exeer-primary">المنشأة: </span>
            {summary.companyName}
          </p>
          <p>
            <span className="font-semibold text-exeer-primary">المدير: </span>
            {summary.adminFullName}
          </p>
          <p>
            <span className="font-semibold text-exeer-primary">البريد: </span>
            {summary.adminEmail}
          </p>
          <p>
            <span className="font-semibold text-exeer-primary">كلمة المرور: </span>
            <span dir="ltr" className="font-mono">
              {summary.password}
            </span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => downloadSubscriberCredentials(summary)}
            className="md-btn-tonal inline-flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" aria-hidden />
            تنزيل بيانات الحساب
          </button>
          <button type="button" onClick={onClose} className="md-btn-primary">
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
