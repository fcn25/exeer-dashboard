import { formatDisplayValue } from "../../utils/displayValue.js";
import { ROLE_LABELS } from "../../constants/roles.js";

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-end text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

/**
 * Read-only employee profile block (mobile + portal).
 * @param {{ employee: object | null, isLoading?: boolean }} props
 */
export default function EmployeeProfileSummary({ employee, isLoading = false }) {
  if (isLoading) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">جاري تحميل البيانات...</p>
    );
  }

  if (!employee) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        تعذّر تحميل بيانات الملف الشخصي.
      </p>
    );
  }

  const roleLabel =
    ROLE_LABELS[employee.role] ?? formatDisplayValue(employee.role);

  return (
    <dl className="rounded-md border border-gray-200 bg-white px-4 py-1 shadow-none">
      <ProfileRow
        label="المسمى الوظيفي"
        value={formatDisplayValue(employee.job_title_name)}
      />
      <ProfileRow
        label="القسم"
        value={formatDisplayValue(employee.department)}
      />
      <ProfileRow
        label="رقم الهوية"
        value={formatDisplayValue(employee.id_number)}
      />
      <ProfileRow
        label="رقم الموظف"
        value={formatDisplayValue(employee.employee_number)}
      />
      <ProfileRow label="الدور" value={roleLabel} />
      <ProfileRow
        label="رصيد الإجازات"
        value={formatDisplayValue(employee.leave_balance, {
          asNumber: true,
          suffix: "يوم",
        })}
      />
      <ProfileRow
        label="البريد الإلكتروني"
        value={formatDisplayValue(employee.email)}
      />
      <ProfileRow
        label="الجوال"
        value={formatDisplayValue(employee.phone_number)}
      />
    </dl>
  );
}
