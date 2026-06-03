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
      className="relative rounded-md border border-gray-200 bg-white p-4 md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3 pe-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-slate-900">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-slate-700 md:text-base">
            استكشف القيمة الحقيقية للنظام! استخدم{" "}
            <strong className="font-semibold text-slate-900">المعالج الذكي للبيانات</strong> لإضافة فريقك
            بضغطة زر، وابدأ في استقبال تقارير الأداء والتحليلات المدعومة بالذكاء
            الاصطناعي.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/employees?bulkImport=1")}
          className="md-btn-primary shrink-0 whitespace-nowrap"
        >
          المعالج الذكي للبيانات
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute end-2 top-2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900"
        aria-label="إخفاء التنبيه"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
