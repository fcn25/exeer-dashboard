import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ROLE_LABELS, STANDARD_ROLES } from "../../constants/roles.js";
import { DateInput } from "../ui/DateInput.jsx";
import { getInitials } from "./employeeFormShared.js";

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

export default function EmployeeFormSections({
  form,
  onChange,
  disabled = false,
  departmentOptions = [],
  showAvatar = false,
}) {
  const update = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass = `md-input disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <div className="space-y-5">
      {showAvatar ? (
        <div className="flex justify-center pb-2">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-exeer-border bg-white text-xl font-bold text-exeer-primary">
            {form.image ? (
              <img src={form.image} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(form.full_name)
            )}
          </span>
        </div>
      ) : null}

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
          <Field label="رابط الصورة">
            <input
              type="url"
              value={form.image}
              onChange={(e) => update("image", e.target.value)}
              disabled={disabled}
              placeholder="https://"
              className={`${inputClass} sm:col-span-2`}
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
            <input
              type="text"
              value={form.direct_manager_name}
              onChange={(e) => update("direct_manager_name", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="المسمى الوظيفي">
            <input
              type="text"
              value={form.job_title_name}
              onChange={(e) => update("job_title_name", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <Field label="موقع العمل">
            <input
              type="text"
              value={form.work_location_name}
              onChange={(e) => update("work_location_name", e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
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
          <Field label="رقم الآيبان">
            <input
              type="text"
              value={form.iban}
              onChange={(e) => update("iban", e.target.value)}
              disabled={disabled}
              className={`${inputClass} sm:col-span-2`}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
