import * as XLSX from "xlsx";
import { normalizeAppRole } from "../constants/roles.js";

/** Matches public/ListEmployeeExeer.csv */
export const EMPLOYEE_IMPORT_TEMPLATE_FILE = "ListEmployeeExeer.csv";

export const EMPLOYEE_IMPORT_TEMPLATE_COLUMNS_AR = [
  "الاسم الكامل (full_name)",
  "البريد الإلكتروني (email)",
  "الجوال (phone_number)",
  "الجنس (gender)",
  "تاريخ الميلاد (date_of_birth)",
  "الجنسية (nationality)",
  "رقم الهوية (id_number)",
  "العنوان الوطني (national_address)",
  "تاريخ التعيين (hire_date)",
  "نوع العقد (contract_type)",
  "الراتب الأساسي (basic_salary)",
  "بدل السكن (housing_allowance)",
  "الآيبان (iban)",
  "رصيد الإجازات (leave_balance)",
  "القسم (department_name)",
  "المسمى الوظيفي (job_title_name)",
  "موقع العمل (work_location_name)",
  "المدير المباشر (direct_manager_name)",
  "الدور (role)",
];

const HEADER_ALIASES = {
  full_name: [
    "full_name",
    "fullname",
    "name",
    "الاسم",
    "الاسم الكامل",
    "اسم الموظف",
  ],
  email: ["email", "e-mail", "البريد", "البريد الإلكتروني"],
  phone_number: ["phone", "phone_number", "mobile", "الجوال", "رقم الجوال"],
  gender: ["gender", "الجنس"],
  date_of_birth: ["date_of_birth", "dob", "تاريخ الميلاد"],
  nationality: ["nationality", "الجنسية"],
  id_number: ["id_number", "national_id", "رقم الهوية", "الهوية"],
  national_address: [
    "national_address",
    "العنوان الوطني",
    "national address",
  ],
  hire_date: ["hire_date", "تاريخ التعيين", "تاريخ التوظيف"],
  contract_type: ["contract_type", "نوع العقد"],
  basic_salary: ["basic_salary", "الراتب الأساسي", "الراتب"],
  housing_allowance: ["housing_allowance", "بدل السكن"],
  iban: ["iban", "الآيبان", "رقم الآيبان"],
  leave_balance: ["leave_balance", "رصيد الإجازات", "الإجازات"],
  department: [
    "department",
    "department_name",
    "dept",
    "القسم",
    "الإدارة",
  ],
  job_title_name: [
    "job_title",
    "job_title_name",
    "title",
    "المسمى",
    "المسمى الوظيفي",
  ],
  work_location_name: [
    "work_location_name",
    "work_location",
    "branch",
    "موقع العمل",
    "الفرع",
  ],
  direct_manager_name: [
    "direct_manager_name",
    "direct_manager",
    "المدير المباشر",
    "مدير مباشر",
  ],
  role: ["role", "الدور", "الدور الوظيفي"],
  employee_number: ["employee_number", "emp_no", "رقم الموظف"],
};

const ALLOWED_IMPORT_ROLES = new Set([
  "owner",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
  "Employee",
]);

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveColumnKey(header) {
  const normalized = normalizeHeader(header);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return key;
    }
  }
  return null;
}

function parseSpreadsheetDate(value) {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  const parts = str.split(/[/-]/).map((part) => part.trim());
  if (parts.length === 3) {
    let day = Number(parts[0]);
    let month = Number(parts[1]);
    let year = Number(parts[2]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    if (day && month && year) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeImportRole(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Employee";

  const lower = raw.toLowerCase();
  if (lower === "manager" || lower === "department head") {
    return "Direct_Manager";
  }

  const normalized = normalizeAppRole(raw);
  return ALLOWED_IMPORT_ROLES.has(normalized) ? normalized : "Employee";
}

function rowToEmployee(row, columnMap) {
  const record = {};
  row.forEach((cell, index) => {
    const key = columnMap[index];
    if (!key) return;
    const text = String(cell ?? "").trim();
    if (text) record[key] = text;
  });

  if (!record.full_name) return null;

  return {
    full_name: record.full_name,
    email: record.email || null,
    phone_number: record.phone_number || null,
    gender: record.gender || "ذكر",
    date_of_birth: parseSpreadsheetDate(record.date_of_birth),
    nationality: record.nationality || null,
    id_number: record.id_number ? Number(record.id_number) : null,
    national_address: record.national_address || null,
    hire_date: parseSpreadsheetDate(record.hire_date),
    contract_type: record.contract_type || "دوام كامل",
    basic_salary: parseNumber(record.basic_salary),
    housing_allowance: parseNumber(record.housing_allowance),
    iban: record.iban || null,
    leave_balance: parseNumber(record.leave_balance, 0),
    department: record.department || null,
    job_title_name: record.job_title_name || null,
    work_location_name: record.work_location_name || null,
    direct_manager_name: record.direct_manager_name || null,
    employee_number: record.employee_number || null,
    role: normalizeImportRole(record.role),
    employment_status: "نشط",
    other_allowance: 0,
  };
}

export async function parseEmployeeSpreadsheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("الملف لا يحتوي على أوراق عمل.");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  });

  if (rows.length < 2) {
    throw new Error("يجب أن يحتوي الملف على صف عناوين وصف واحد على الأقل.");
  }

  const headerRow = rows[0];
  const columnMap = headerRow.map((header) => resolveColumnKey(header));

  if (!columnMap.some((key) => key === "full_name")) {
    throw new Error(
      "لم يتم العثور على عمود الاسم. استخدم نموذج ListEmployeeExeer.csv أو عمود full_name.",
    );
  }

  const employees = [];
  for (let i = 1; i < rows.length; i += 1) {
    const mapped = rowToEmployee(rows[i], columnMap);
    if (mapped) employees.push(mapped);
  }

  if (employees.length === 0) {
    throw new Error("لم يتم العثور على موظفين صالحين في الملف.");
  }

  return employees;
}
