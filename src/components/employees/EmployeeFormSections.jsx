import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { ROLE_LABELS, STANDARD_ROLES } from "../../constants/roles.js";
import { useCompanySettings } from "../../context/CompanySettingsContext.jsx";
import {
  getActiveCompanyPeriods,
  normalizeEmployeeWorkPeriodIds,
  parseWorkPeriodsSetting,
} from "../../utils/attendance/workSchedules.js";
import { DateInput } from "../ui/DateInput.jsx";
function WorkPeriodAssignmentField({ form, update, disabled }) {
  const { getSetting } = useCompanySettings();
  const periods = useMemo(
    () => getActiveCompanyPeriods(parseWorkPeriodsSetting(getSetting)),
    [getSetting],
  );
  const selected = normalizeEmployeeWorkPeriodIds(form.work_period_ids, periods);

  const togglePeriod = (periodId) => {
    const next = selected.includes(periodId)
      ? selected.filter((id) => id !== periodId)
      : [...selected, periodId].sort();
    if (!next.length) return;
    update("work_period_ids", next);
  };

  if (periods.length <= 1) {
    const period = periods[0];
    return (
      <p className="rounded-md border border-exeer-border bg-md-surface-dim px-3 py-2 text-sm text-exeer-muted">
        {period.name} ({period.start} – {period.end})
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {periods.map((period) => {
        const checked = selected.includes(period.id);
        return (
          <label
            key={period.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-exeer-border bg-white px-3 py-2.5 dark:bg-slate-950/40"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled || (checked && selected.length === 1)}
              onChange={() => togglePeriod(period.id)}
              className="mt-1 h-4 w-4 rounded border-exeer-border"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-exeer-primary">
                {period.name}
              </span>
              <span className="block text-xs text-exeer-muted">
                {period.start} – {period.end}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-exeer-primary">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function Section({ title, description, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="md-surface-muted overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition-colors hover:bg-exeer-hover"
      >
        <div>
          <h3 className="text-sm font-bold text-exeer-primary">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-exeer-muted">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-exeer-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-exeer-border px-5 py-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function DirectManagerSelect({
  form,
  update,
  disabled,
  managerOptions = [],
  inputClass,
}) {
  const normalizedName = String(form.direct_manager_name ?? "").trim();
  const matchedManager = managerOptions.find(
    (manager) => manager.name === normalizedName,
  );
  const selectedId = matchedManager ? String(matchedManager.id) : "";

  const handleChange = (event) => {
    const nextId = event.target.value;
    if (!nextId) {
      update("direct_manager_name", "");
      return;
    }
    const manager = managerOptions.find((item) => String(item.id) === nextId);
    update("direct_manager_name", manager?.name ?? "");
  };

  return (
    <select
      value={selectedId}
      onChange={handleChange}
      disabled={disabled}
      className={inputClass}
    >
      <option value="">— اختر المدير —</option>
      {normalizedName && !matchedManager ? (
        <option value="" disabled>
          {normalizedName} (محفوظ سابقاً — اختر من القائمة)
        </option>
      ) : null}
      {managerOptions.map((manager) => (
        <option key={manager.id} value={manager.id}>
          {manager.label ?? manager.name}
        </option>
      ))}
    </select>
  );
}

export default function EmployeeFormSections({
  form,
  onChange,
  disabled = false,
  departmentOptions = [],
  jobTitleOptions = [],
  branchOptions = [],
  branchesLoading = false,
  managerOptions = [],
}) {
  const update = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass = `md-input disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <div className="space-y-5">
      <Section title="البيانات الشخصية" description="معلومات الهوية والتواصل">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" required>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="رقم الجوال">
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="الجنس">
            <select
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </Field>
          <Field label="تاريخ الميلاد">
            <DateInput
              id="employee-date-of-birth"
              value={form.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="الجنسية">
            <input
              type="text"
              value={form.nationality}
              onChange={(e) => update("nationality", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="رقم الإقامة">
            <input
              type="text"
              value={form.iqama_number}
              onChange={(e) => update("iqama_number", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="تاريخ انتهاء الإقامة">
            <DateInput
              id="employee-iqama-expiry"
              value={form.iqama_expiry_date}
              onChange={(e) => update("iqama_expiry_date", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="تاريخ انتهاء رخصة العمل">
            <DateInput
              id="employee-work-permit-expiry"
              value={form.work_permit_expiry_date}
              onChange={(e) => update("work_permit_expiry_date", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="رقم الهوية">
            <input
              type="text"
              inputMode="numeric"
              value={form.id_number}
              onChange={(e) => update("id_number", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="العنوان الوطني">
            <input
              type="text"
              value={form.national_address}
              onChange={(e) => update("national_address", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="البيانات الوظيفية" description="المنصب، العقد، والإدارة">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="رقم الموظف">
            <input
              type="text"
              value={form.employee_number}
              onChange={(e) => update("employee_number", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="تاريخ التعيين">
            <DateInput
              id="employee-hire-date"
              value={form.hire_date}
              onChange={(e) => update("hire_date", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="نهاية فترة التجربة">
            <DateInput
              id="employee-probation-end"
              value={form.probation_end_date}
              onChange={(e) => update("probation_end_date", e.target.value)}
              disabled={disabled}
            />
          </Field>
          <Field label="نوع العقد">
            <select
              value={form.contract_type}
              onChange={(e) => update("contract_type", e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              <option value="دوام كامل">دوام كامل</option>
              <option value="عقد محدد">عقد محدد</option>
              <option value="جزئي">جزئي</option>
            </select>
          </Field>
          <Field label="حالة التوظيف">
            <select
              value={form.employment_status}
              onChange={(e) => update("employment_status", e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              <option value="نشط">نشط</option>
              <option value="إجازة">إجازة</option>
              <option value="منتهي">منتهي</option>
            </select>
          </Field>
          <Field label="الدور الوظيفي">
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              {STANDARD_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المدير المباشر">
            <DirectManagerSelect
              form={form}
              update={update}
              disabled={disabled}
              managerOptions={managerOptions}
              inputClass={inputClass}
            />
          </Field>
          <Field label="المسمى الوظيفي">
            {jobTitleOptions.length > 0 ? (
              <select
                value={form.job_title_name}
                onChange={(e) => update("job_title_name", e.target.value)}
                disabled={disabled}
                className={inputClass}
              >
                <option value="">— اختر —</option>
                {jobTitleOptions.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.job_title_name}
                onChange={(e) => update("job_title_name", e.target.value)}
                disabled={disabled}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="موقع العمل">
            <select
              value={form.work_location_id ?? ""}
              onChange={(e) => update("work_location_id", e.target.value)}
              disabled={disabled || branchesLoading}
              className={inputClass}
            >
              <option value="">
                {branchesLoading ? "جاري تحميل الفروع..." : "غير محدد"}
              </option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {!branchesLoading && branchOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-exeer-muted">
                لا توجد فروع لهذه الشركة. عرّفها من إعدادات البصمة أولاً.
              </p>
            ) : null}
          </Field>
          <Field label="مواعيد الدوام المعيّنة">
            <WorkPeriodAssignmentField
              form={form}
              update={update}
              disabled={disabled}
            />
            <p className="mt-1.5 text-xs text-exeer-muted">
              يحدد فترات الحضور والانصراف في البصمة لهذا الموظف.
            </p>
          </Field>
          <Field label="الإدارة">
            {departmentOptions.length > 0 ? (
              <select
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
                disabled={disabled}
                className={inputClass}
              >
                <option value="">— اختر —</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
                disabled={disabled}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="البيانات المالية" description="الراتب والبدلات">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الراتب الأساسي">
            <input
              type="number"
              min="0"
              value={form.basic_salary}
              onChange={(e) => update("basic_salary", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="بدل السكن">
            <input
              type="number"
              min="0"
              value={form.housing_allowance}
              onChange={(e) => update("housing_allowance", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="بدلات أخرى">
            <input
              type="number"
              min="0"
              value={form.other_allowance}
              onChange={(e) => update("other_allowance", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="اسم البنك">
            <input
              type="text"
              value={form.bank_name}
              onChange={(e) => update("bank_name", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="رقم الآيبان">
            <input
              type="text"
              value={form.iban}
              onChange={(e) => update("iban", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
