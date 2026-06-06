import * as XLSX from "xlsx";
import { normalizeAppRole } from "../constants/roles.js";

/** Canonical template: public/ListEmployeeExeer.csv */
export const EMPLOYEE_IMPORT_TEMPLATE_FILE = "ListEmployeeExeer.csv";

export const EMPLOYEE_IMPORT_TEMPLATE_COLUMNS_AR = [
  "الاسم الكامل (full_name)",
  "البريد الإلكتروني (email)",
  "الجوال (phone_number)",
  "المسمى الوظيفي (job_title_name)",
  "رقم الموظف (employee_number / employee_id)",
];

const HEADER_ALIASES = {
  full_name: [
    "full_name",
    "fullname",
    "name",
    "full name",
    "الاسم",
    "الاسم الكامل",
    "اسم الموظف",
  ],
  email: [
    "email",
    "e-mail",
    "e mail",
    "البريد",
    "البريد الإلكتروني",
    "البريد الالكتروني",
    "البريد الالكترونى",
  ],
  phone_number: [
    "phone",
    "phone_number",
    "mobile",
    "الجوال",
    "رقم الجوال",
  ],
  job_title_name: [
    "job_title",
    "job_title_name",
    "job title",
    "title",
    "المسمى",
    "المسمى الوظيفي",
  ],
  employee_number: [
    "employee_number",
    "employee_id",
    "emp_no",
    "emp id",
    "رقم الموظف",
    "معرف الموظف",
  ],
  role: ["role", "الدور", "الدور الوظيفي"],
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
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
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

function isRowEmpty(row) {
  if (!Array.isArray(row)) return true;
  return !row.some((cell) => String(cell ?? "").trim() !== "");
}

export function isValidEmployeeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmployeeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!isValidEmployeeEmail(email)) return null;
  return email;
}

function normalizeImportRole(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

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

  const parsed = {
    full_name: record.full_name,
    email: normalizeEmployeeEmail(record.email),
    phone_number: record.phone_number || null,
    job_title_name: record.job_title_name || null,
    employee_number: record.employee_number || null,
  };

  const role = normalizeImportRole(record.role);
  if (role) parsed.role = role;

  return parsed;
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
    if (isRowEmpty(rows[i])) continue;
    const mapped = rowToEmployee(rows[i], columnMap);
    if (mapped) employees.push(mapped);
  }

  if (employees.length === 0) {
    throw new Error("لم يتم العثور على موظفين صالحين في الملف.");
  }

  return employees;
}
