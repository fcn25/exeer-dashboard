export const EMPTY_EMPLOYEE_FORM = {
  id: "",
  full_name: "",
  email: "",
  phone_number: "",
  gender: "ذكر",
  date_of_birth: "",
  nationality: "",
  id_number: "",
  national_address: "",
  employee_number: "",
  hire_date: "",
  contract_type: "دوام كامل",
  employment_status: "نشط",
  role: "Employee",
  direct_manager_name: "",
  job_title_name: "",
  work_location_id: "",
  department: "",
  basic_salary: "",
  housing_allowance: "",
  other_allowance: "",
  bank_name: "",
  iban: "",
  transport_allowance: "",
};

export function toDateInputValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(
    typeof value === "number" && value < 1e12 ? value * 1000 : value,
  );
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function mapRowToEmployeeForm(row) {
  if (!row || typeof row !== "object") return { ...EMPTY_EMPLOYEE_FORM };

  return {
    id: String(row.id ?? ""),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    phone_number: String(row.phone_number ?? ""),
    gender: String(row.gender ?? "ذكر"),
    date_of_birth: toDateInputValue(row.date_of_birth),
    nationality: String(row.nationality ?? ""),
    id_number: row.id_number != null ? String(row.id_number) : "",
    national_address: String(row.national_address ?? ""),
    employee_number: String(row.employee_number ?? ""),
    hire_date: toDateInputValue(row.hire_date),
    contract_type: String(row.contract_type ?? "دوام كامل"),
    employment_status: String(row.employment_status ?? "نشط"),
    role: String(row.role ?? "Employee"),
    direct_manager_name: String(row.direct_manager_name ?? ""),
    job_title_name: String(row.job_title_name ?? ""),
    work_location_id: row.work_location_id != null ? String(row.work_location_id) : "",
    department: String(row.department ?? ""),
    basic_salary:
      row.basic_salary != null && row.basic_salary !== ""
        ? String(row.basic_salary)
        : "",
    housing_allowance:
      row.housing_allowance != null && row.housing_allowance !== ""
        ? String(row.housing_allowance)
        : "",
    other_allowance:
      row.other_allowance != null && row.other_allowance !== ""
        ? String(row.other_allowance)
        : "",
    bank_name: String(row.bank_name ?? ""),
    iban: String(row.iban ?? ""),
    transport_allowance:
      row.transport_allowance != null ? String(row.transport_allowance) : "",
  };
}

export function getInitials(fullName) {
  const parts = String(fullName || "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return parts[0]?.[0] ?? "م";
}
