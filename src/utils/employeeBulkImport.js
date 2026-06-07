import Papa from "papaparse";
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

const IMPORT_FIELD_KEYS = [
  "full_name",
  "email",
  "phone_number",
  "gender",
  "date_of_birth",
  "nationality",
  "iqama_number",
  "iqama_expiry_date",
  "probation_end_date",
  "id_number",
  "national_address",
  "employee_number",
  "hire_date",
  "contract_type",
  "employment_status",
  "role",
  "direct_manager_name",
  "job_title_name",
  "department",
  "basic_salary",
  "housing_allowance",
  "other_allowance",
  "bank_name",
  "iban",
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
  gender: ["gender", "الجنس"],
  date_of_birth: ["date_of_birth", "date of birth", "تاريخ الميلاد"],
  nationality: ["nationality", "الجنسية"],
  iqama_number: ["iqama_number", "iqama number", "رقم الإقامة"],
  iqama_expiry_date: [
    "iqama_expiry_date",
    "iqama expiry",
    "تاريخ انتهاء الإقامة",
  ],
  probation_end_date: [
    "probation_end_date",
    "probation end",
    "نهاية فترة التجربة",
  ],
  id_number: [
    "id_number",
    "id number",
    "national_id",
    "رقم الهوية",
    "الهوية",
  ],
  national_address: ["national_address", "national address", "العنوان الوطني"],
  employee_number: [
    "employee_number",
    "employee_id",
    "emp_no",
    "emp id",
    "رقم الموظف",
    "معرف الموظف",
  ],
  hire_date: ["hire_date", "hire date", "تاريخ التعيين", "تاريخ التوظيف"],
  contract_type: ["contract_type", "contract type", "نوع العقد"],
  employment_status: [
    "employment_status",
    "employment status",
    "حالة التوظيف",
    "الحالة",
  ],
  role: ["role", "الدور", "الدور الوظيفي"],
  direct_manager_name: [
    "direct_manager_name",
    "direct manager",
    "المدير المباشر",
  ],
  job_title_name: [
    "job_title",
    "job_title_name",
    "job title",
    "title",
    "المسمى",
    "المسمى الوظيفي",
  ],
  department: ["department", "الإدارة", "القسم"],
  basic_salary: ["basic_salary", "basic salary", "الراتب الأساسي"],
  housing_allowance: ["housing_allowance", "housing allowance", "بدل السكن"],
  other_allowance: ["other_allowance", "other allowance", "بدلات أخرى"],
  bank_name: ["bank_name", "bank name", "اسم البنك"],
  iban: ["iban", "الآيبان", "ايبان"],
};

const ROLE_MAP = {
  موظف: "Employee",
  "مدير مباشر": "Direct_Manager",
  "مدير الموارد البشرية": "HR_Manager",
  "مساعد الموارد البشرية": "HR_Assistant",
  تنفيذي: "Executive",
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
  const raw = String(header ?? "").trim();
  const normalized = normalizeHeader(raw);

  const parenthetical = raw.match(/\(([^)]+)\)/);
  if (parenthetical) {
    const innerKey = normalizeHeader(parenthetical[1]).replace(/ /g, "_");
    if (IMPORT_FIELD_KEYS.includes(innerKey)) return innerKey;
  }

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return key;
    }
  }

  const directKey = normalized.replace(/ /g, "_");
  if (IMPORT_FIELD_KEYS.includes(directKey)) return directKey;

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

  if (ROLE_MAP[raw]) return ROLE_MAP[raw];

  const lower = raw.toLowerCase();
  if (lower === "manager" || lower === "department head") {
    return "Direct_Manager";
  }

  const normalized = normalizeAppRole(raw);
  return ALLOWED_IMPORT_ROLES.has(normalized) ? normalized : "Employee";
}

function nullableText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseImportNumber(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function parseImportDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  return null;
}

function parseIdNumber(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function isCsvFile(file) {
  const name = String(file?.name ?? "").toLowerCase();
  const type = String(file?.type ?? "").toLowerCase();
  return (
    name.endsWith(".csv") ||
    type === "text/csv" ||
    type === "application/csv" ||
    type === "text/comma-separated-values"
  );
}

function stripUtf8Bom(value) {
  const text = String(value ?? "");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function normalizeSpreadsheetRows(rows) {
  return (rows ?? []).map((row) => {
    if (!Array.isArray(row)) return row;
    return row.map((cell) => stripUtf8Bom(String(cell ?? "").trim()));
  });
}

function parseCsvFileUtf8(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      encoding: "UTF-8",
      skipEmptyLines: false,
      complete: (results) => {
        if (results.errors?.length) {
          const message = results.errors
            .map((item) => item.message)
            .filter(Boolean)
            .join(" ");
          if (message) {
            reject(new Error(message));
            return;
          }
        }
        resolve(normalizeSpreadsheetRows(results.data));
      },
      error: (error) => {
        reject(new Error(error?.message || "تعذّر قراءة ملف CSV."));
      },
    });
  });
}

async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("الملف لا يحتوي على أوراق عمل.");
  }

  return normalizeSpreadsheetRows(
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    }),
  );
}

function employeesFromRows(rows) {
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

function rowToEmployee(row, columnMap) {
  const record = {};
  row.forEach((cell, index) => {
    const key = columnMap[index];
    if (!key) return;
    record[key] = String(cell ?? "").trim();
  });

  const fullName = nullableText(record.full_name);
  if (!fullName) return null;

  const parsed = {
    full_name: fullName,
    email: normalizeEmployeeEmail(record.email),
    phone_number: nullableText(record.phone_number),
    gender: nullableText(record.gender),
    date_of_birth: parseImportDate(record.date_of_birth),
    nationality: nullableText(record.nationality),
    iqama_number: nullableText(record.iqama_number),
    iqama_expiry_date: parseImportDate(record.iqama_expiry_date),
    probation_end_date: parseImportDate(record.probation_end_date),
    id_number: parseIdNumber(record.id_number),
    national_address: nullableText(record.national_address),
    employee_number: nullableText(record.employee_number),
    hire_date: parseImportDate(record.hire_date),
    contract_type: nullableText(record.contract_type),
    employment_status: nullableText(record.employment_status),
    direct_manager_name: nullableText(record.direct_manager_name),
    job_title_name: nullableText(record.job_title_name),
    department: nullableText(record.department),
    basic_salary: parseImportNumber(record.basic_salary),
    housing_allowance: parseImportNumber(record.housing_allowance),
    other_allowance: parseImportNumber(record.other_allowance),
    bank_name: nullableText(record.bank_name),
    iban: nullableText(record.iban),
    role: normalizeImportRole(record.role) ?? "Employee",
  };

  return parsed;
}

export async function parseEmployeeSpreadsheet(file) {
  const rows = isCsvFile(file)
    ? await parseCsvFileUtf8(file)
    : await parseExcelFile(file);

  return employeesFromRows(rows);
}
