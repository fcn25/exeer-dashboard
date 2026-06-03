import * as XLSX from "xlsx";

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
  department: ["department", "dept", "القسم", "الإدارة"],
  job_title_name: [
    "job_title",
    "job_title_name",
    "title",
    "المسمى",
    "المسمى الوظيفي",
  ],
  employee_number: ["employee_number", "emp_no", "رقم الموظف"],
};

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
    role: "Employee",
    employment_status: "نشط",
    contract_type: "دوام كامل",
    gender: "ذكر",
    basic_salary: 0,
    housing_allowance: 0,
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
  });

  if (rows.length < 2) {
    throw new Error("يجب أن يحتوي الملف على صف عناوين وصف واحد على الأقل.");
  }

  const headerRow = rows[0];
  const columnMap = headerRow.map((header) => resolveColumnKey(header));

  if (!columnMap.some((key) => key === "full_name")) {
    throw new Error(
      "لم يتم العثور على عمود الاسم. استخدم «الاسم الكامل» أو full_name.",
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
