import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export default function PlgOnboardingBanner({ employeeCount }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || employeeCount > 2) return null;

  return (
    <div
      role="region"
      aria-label="تفعيل المنشأة"
      className="relative overflow-hidden rounded-3xl border border-md-primary/20 bg-md-primary-container p-5 shadow-sm dark:border-[#2563eb]/30 dark:bg-[#1e3a5f]/80 md:p-6"
    >
      <div className="pointer-events-none absolute -start-6 -top-6 h-24 w-24 rounded-full bg-md-primary/10" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 pe-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-md-primary text-white dark:bg-[#2563eb]">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-exeer-primary md:text-base">
            استكشف القيمة الحقيقية للنظام! استخدم{" "}
            <strong className="font-bold">المعالج الذكي للبيانات</strong> لإضافة فريقك
            بضغطة زر، وابدأ في استقبال تقارير الأداء والتحليلات المدعومة بالذكاء
            الاصطناعي.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/employees?bulkImport=1")}
          className="md-btn-primary shrink-0 whitespace-nowrap shadow-md"
        >
          المعالج الذكي للبيانات
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute end-3 top-3 rounded-xl p-1.5 text-exeer-muted transition-colors hover:bg-white/60 hover:text-exeer-primary dark:hover:bg-black/20"
        aria-label="إخفاء التنبيه"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
