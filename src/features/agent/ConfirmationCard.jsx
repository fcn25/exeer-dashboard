import { Shield } from "lucide-react";
import { AGENT_PRIMARY_BTN, AGENT_SECONDARY_BTN } from "./agentStyles.js";

export default function ConfirmationCard({
  employeeName,
  employeeId,
  department,
  initials,
  currentTitle,
  newTitle,
  status = "pending",
  onConfirm,
  onCancel,
}) {
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled";

  return (
    <article
      className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-4"
      aria-live="polite"
    >
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        isConfirmed
          ? "border border-emerald-200 bg-[#ECFDF5] text-[#047857]"
          : isCancelled
            ? "border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
            : "border border-amber-200 bg-amber-50 text-amber-900"
      }`}>
        {isConfirmed
          ? "تم التغيير ✅"
          : isCancelled
            ? "تم الإلغاء"
            : "بانتظار تأكيدك — لم يُنفَّذ بعد"}
      </span>

      <div className="mt-4 flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-sm font-semibold text-[#0F172A]"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 text-start">
          <p className="text-sm font-semibold text-[#0F172A]">{employeeName}</p>
          <p className="mt-0.5 text-xs font-normal text-[#64748B]">
            رقم الموظف #{employeeId} · {department}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[#64748B]">المسمى الحالي</span>
          <span className="font-normal text-[#94A3B8] line-through">{currentTitle}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[#64748B]">المسمى الجديد</span>
          <span className="rounded-lg bg-[#ECFDF5] px-2.5 py-1 font-medium text-[#047857]">
            {newTitle}
          </span>
        </div>
      </div>

      {!isConfirmed && !isCancelled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onConfirm} className={AGENT_PRIMARY_BTN}>
            تأكيد التغيير
          </button>
          <button type="button" onClick={onCancel} className={AGENT_SECONDARY_BTN}>
            إلغاء
          </button>
        </div>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs font-normal leading-relaxed text-[#64748B]">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.75]" aria-hidden />
        يُسجَّل هذا الإجراء في سجل التدقيق باسمك
      </p>
    </article>
  );
}
