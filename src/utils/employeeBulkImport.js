import * as XLSX from "xlsx";

/** Default CSV template — must match Supabase `employees` import fields */
export const EMPLOYEE_CSV_TEMPLATE_FILENAME = "ExeerAdd_list_employees.csv";

export const EMPLOYEE_CSV_TEMPLATE_HEADERS = [
  "Full Name",
  "Email",
  "Phone",
  "Department",
  "Job Title",
  "Role",
];

const HEADER_ALIASES = {
  full_name: [
    "full_name",
    "fullname",
    "full name",
    "name",
    "الاسم",
    "الاسم الكامل",
    "اسم الموظف",
  ],
  email: ["email", "e-mail", "البريد", "البريد الإلكتروني"],
  phone_number: ["phone", "phone_number", "mobile", "الجوال", "رقم الجوال"],
  department: ["department", "dept", "القسم", "الإدارة"],
  job_title_name: [
    "job_title",
    "job title",
    "job_title_name",
    "title",
    "المسمى",
    "المسمى الوظيفي",
  ],
  role: ["role", "الدور", "الصلاحية"],
  employee_number: ["employee_number", "emp_no", "رقم الموظف"],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizeRole(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Employee";
  const lower = raw.toLowerCase().replace(/\s+/g, "_");
  const map = {
    employee: "Employee",
    موظف: "Employee",
    owner: "owner",
    مالك: "owner",
    executive: "Executive",
    hr_manager: "HR_Manager",
    hr: "HR_Manager",
    hr_assistant: "HR_Assistant",
    direct_manager: "Direct_Manager",
    manager: "Direct_Manager",
  };
  if (map[lower]) return map[lower];
  if (
    [
      "owner",
      "Executive",
      "HR_Manager",
      "HR_Assistant",
      "Direct_Manager",
      "Employee",
    ].includes(raw)
  ) {
    return raw;
  }
  return "Employee";
}

function rowToEmployee(row, columnMap) {
  const record = {};
  row.forEach((cell, index) => {
    const key = columnMap[index];
    if (!key) return;
    record[key] = String(cell ?? "").trim();
  });

  if (!record.full_name) return null;

  return {
    full_name: record.full_name,
    email: record.email || null,
    phone_number: record.phone_number || null,
    department: record.department || null,
    job_title_name: record.job_title_name || null,
    employee_number: record.employee_number || null,
    role: normalizeRole(record.role),
    employment_status: "نشط",
    contract_type: "دوام كامل",
    gender: "ذكر",
    basic_salary: 0,
    housing_allowance: 0,
    other_allowance: 0,
  };
}

function parseRowsMatrix(rows) {
  if (rows.length < 2) {
    throw new Error("يجب أن يحتوي الملف على صف عناوين وصف واحد على الأقل.");
  }

  const headerRow = rows[0];
  const columnMap = headerRow.map((header) => resolveColumnKey(header));

  if (!columnMap.some((key) => key === "full_name")) {
    throw new Error(
      "لم يتم العثور على عمود الاسم. استخدم «Full Name» أو «الاسم الكامل».",
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

/** Parse CSV text (RFC 4180–style, supports quoted fields) */
export function parseCsvText(text) {
  const lines = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => String(cell).trim() !== "")) {
        lines.push(row);
      }
      row = [];
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) {
    lines.push(row);
  }

  return lines;
}

export async function parseEmployeeCsv(file) {
  const text = await file.text();
  const stripped = text.replace(/^\uFEFF/, "");
  const rows = parseCsvText(stripped);
  return parseRowsMatrix(rows);
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
  });

  return parseRowsMatrix(rows);
}

export async function parseEmployeeImportFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return parseEmployeeCsv(file);
  }
  return parseEmployeeSpreadsheet(file);
}

export function downloadEmployeeCsvTemplate() {
  const headerLine = EMPLOYEE_CSV_TEMPLATE_HEADERS.join(",");
  const exampleLine = [
    "أحمد محمد",
    "ahmed@company.com",
    "0500000000",
    "الموارد البشرية",
    "أخصائي موارد بشرية",
    "Employee",
  ].join(",");
  const content = `\uFEFF${headerLine}\n${exampleLine}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = EMPLOYEE_CSV_TEMPLATE_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function validateEmployeeImportRows(rows) {
  const valid = [];
  const invalid = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const email = String(row.email ?? "").trim();

    if (email && !EMAIL_PATTERN.test(email)) {
      invalid.push({
        rowNumber,
        full_name: row.full_name,
        message: "بريد إلكتروني غير صالح",
      });
      return;
    }

    valid.push(row);
  });

  return { valid, invalid };
}
