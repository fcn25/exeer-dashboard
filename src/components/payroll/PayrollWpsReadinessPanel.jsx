import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function PayrollWpsReadinessPanel({
  report,
  isLoading = false,
  error = "",
}) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-none">
        جاري فحص جاهزية WPS...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-none">
        {error}
      </div>
    );
  }

  if (!report) return null;

  const blockedEmployees = report.employees.filter((row) => !row.isReady);

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-none">
      <div className="flex flex-wrap items-center gap-2">
        {report.isReady ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" aria-hidden />
        )}
        <p className="text-sm font-semibold text-slate-900">
          {report.readyCount} موظف جاهز، {report.blockedCount} موظف تنقصه
          بيانات
        </p>
      </div>

      {report.companyMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {report.companyMessage}
          {report.companyBlockers.length > 0 ? (
            <span className="mt-1 block text-xs font-normal">
              {report.companyBlockers.join(" — ")}
            </span>
          ) : null}
        </p>
      ) : null}

      {blockedEmployees.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            الموظفون الذين يحتاجون تصحيحاً:
          </p>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
            {blockedEmployees.map((row) => (
              <li
                key={row.employeeId}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950"
              >
                <span className="font-medium">{row.employeeName}</span>
                <span className="mt-1 block text-xs">
                  ينقص: {row.blockers.join("، ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.warnings?.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            تحذيرات (لا تمنع التصدير بعد اكتمال البيانات):
          </p>
          <ul className="space-y-1 text-xs text-amber-900">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.isReady ? (
        <p className="text-xs text-emerald-700">
          جميع البيانات جاهزة — يمكنك تصدير ملف WPS.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          أكمل البيانات الناقصة ثم أعد فحص الجاهزية لتفعيل التصدير.
        </p>
      )}
    </div>
  );
}
