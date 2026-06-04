import Papa from "papaparse";
import { ATTENDANCE_CSV_HEADERS } from "./csvTemplate.js";

const REQUIRED_HEADERS = ATTENDANCE_CSV_HEADERS;

const STATUS_ALIASES = {
  حضور: "حضور",
  present: "حضور",
  غياب: "غياب",
  absent: "غياب",
  absence: "غياب",
  إجازة: "إجازة",
  اجازة: "إجازة",
  leave: "إجازة",
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeStatus(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "حضور";
  const direct = STATUS_ALIASES[key];
  if (direct) return direct;

  const trimmed = String(value ?? "").trim();
  if (STATUS_ALIASES[trimmed]) return STATUS_ALIASES[trimmed];
  if (["حضور", "غياب", "إجازة"].includes(trimmed)) return trimmed;

  return null;
}

function parseDateValue(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const [, d, m, y] = dash;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return null;
}

function parseTimeValue(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseDelayMinutes(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return 0;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num) || num < 0) return null;
  return num;
}

function buildHeaderIndexMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const requiredIndex = REQUIRED_HEADERS.findIndex(
      (item) => normalizeHeader(item) === normalized,
    );
    if (requiredIndex >= 0) {
      map[REQUIRED_HEADERS[requiredIndex]] = index;
    }
  });
  return map;
}

function validateHeaders(headers) {
  const map = buildHeaderIndexMap(headers);
  const missing = REQUIRED_HEADERS.filter((h) => map[h] == null);
  if (missing.length > 0) {
    throw new Error(
      `أعمدة CSV ناقصة: ${missing.join("، ")}. استخدم القالب الافتراضي.`,
    );
  }
  return map;
}

function cell(row, index) {
  if (index == null || index < 0) return "";
  return row[index] ?? "";
}

/**
 * @returns {Promise<{ rows: object[], errors: string[] }>}
 */
export function parseAttendanceCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      encoding: "UTF-8",
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const table = results.data ?? [];
          if (table.length < 2) {
            throw new Error("الملف فارغ أو لا يحتوي على بيانات بعد صف العناوين.");
          }

          const headerRow = table[0];
          const columnMap = validateHeaders(headerRow);
          const parsedRows = [];
          const errors = [];

          for (let i = 1; i < table.length; i += 1) {
            const row = table[i];
            const lineNo = i + 1;
            const employeeNumber = String(
              cell(row, columnMap["الرقم الوظيفي"]),
            ).trim();
            const employeeName = String(
              cell(row, columnMap["اسم الموظف"]),
            ).trim();

            if (!employeeNumber) {
              errors.push(`السطر ${lineNo}: الرقم الوظيفي فارغ.`);
              continue;
            }

            const recordDate = parseDateValue(cell(row, columnMap["التاريخ"]));
            if (!recordDate) {
              errors.push(`السطر ${lineNo}: تاريخ غير صالح.`);
              continue;
            }

            const status = normalizeStatus(cell(row, columnMap["الحالة"]));
            if (!status) {
              errors.push(
                `السطر ${lineNo}: الحالة يجب أن تكون حضور أو غياب أو إجازة.`,
              );
              continue;
            }

            const delayMinutes = parseDelayMinutes(
              cell(row, columnMap["دقائق التأخير"]),
            );
            if (delayMinutes == null) {
              errors.push(`السطر ${lineNo}: دقائق التأخير غير صالحة.`);
              continue;
            }

            parsedRows.push({
              employee_number: employeeNumber,
              employee_name: employeeName || null,
              record_date: recordDate,
              check_in_1: parseTimeValue(cell(row, columnMap["دخول 1"])),
              check_out_1: parseTimeValue(cell(row, columnMap["خروج 1"])),
              check_in_2: parseTimeValue(cell(row, columnMap["دخول 2"])),
              check_out_2: parseTimeValue(cell(row, columnMap["خروج 2"])),
              status,
              delay_minutes: delayMinutes,
            });
          }

          if (parsedRows.length === 0 && errors.length > 0) {
            throw new Error(errors.slice(0, 5).join("\n"));
          }

          resolve({ rows: parsedRows, errors });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => {
        reject(new Error(err?.message || "تعذّر قراءة ملف CSV."));
      },
    });
  });
}
