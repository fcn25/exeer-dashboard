import {
  computePayrollAmounts,
  extractSaudiBankCodeFromIban,
  normalizeIban,
  resolveEmployeeGovernmentId,
} from "./wpsValidation.js";

const TAB = "\t";

function formatWpsAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 100));
}

function formatPayrollMonthForWps(payrollMonth) {
  const raw = String(payrollMonth ?? "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return raw;
  const month = match[1].padStart(2, "0");
  return `${month}/${match[2]}`;
}

function formatValueDateFromPayrollMonth(payrollMonth) {
  const raw = String(payrollMonth ?? "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  const month = Number(match[1]);
  const year = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}${String(month).padStart(2, "0")}${String(lastDay).padStart(2, "0")}`;
}

function buildFileReference(payrollMonth) {
  const compact = String(payrollMonth ?? "")
    .replace(/\//g, "")
    .replace(/[^\d]/g, "");
  const suffix = Date.now().toString().slice(-6);
  const ref = `WPS${compact}${suffix}`;
  return ref.slice(0, 16);
}

function sanitizeField(value) {
  return String(value ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function mapWpsEmployeeRecord(record, payrollMonth) {
  const employee = record.employees ?? {};
  const amounts = computePayrollAmounts(record);
  const iban = normalizeIban(employee.iban);
  const accrualMonth = formatPayrollMonthForWps(
    record.payroll_month ?? payrollMonth,
  );
  const paymentDescription = `راتب ${accrualMonth}`;

  return {
    employeeName: sanitizeField(employee.full_name ?? record.employee_name),
    governmentId: sanitizeField(resolveEmployeeGovernmentId(employee)),
    iban,
    bankCode: extractSaudiBankCodeFromIban(iban),
    nationality: sanitizeField(employee.nationality),
    basicSalary: amounts.basic,
    totalDeductions: amounts.totalDeductions,
    otherEarnings: amounts.otherEarnings,
    netAmount: amounts.net,
    paymentDescription,
    accrualMonth,
    jobTitle: sanitizeField(employee.job_title_name),
    housingAllowance: amounts.housing,
  };
}

/**
 * Build a TAB-delimited WPS SIF text file (Header → Records → Footer).
 */
export function buildWpsSifContent({ company, records, payrollMonth }) {
  if (!records?.length) {
    throw new Error("لا توجد سجلات مسير لتوليد ملف WPS.");
  }

  const employeeRows = records.map((record) =>
    mapWpsEmployeeRecord(record, payrollMonth),
  );
  const totalNet = employeeRows.reduce((sum, row) => sum + row.netAmount, 0);
  const valueDate = formatValueDateFromPayrollMonth(payrollMonth);
  const fileRef = buildFileReference(payrollMonth);

  const lines = [];

  lines.push(
    [
      "HDR",
      "[DEST-ID]",
      "[ESTB-ID]",
      "[BANK-ACC]",
      "[32A-CCY]",
      "[32A-VAL]",
      "[32A-AMT]",
      "[FILE-REF]",
      "[MOL-ESTBID]",
      "[BANK-NAME]",
    ].join(TAB),
  );

  lines.push(
    [
      "HDR",
      sanitizeField(company?.company_bank_name),
      sanitizeField(company?.establishment_id),
      normalizeIban(company?.company_iban),
      "SAR",
      valueDate,
      formatWpsAmount(totalNet),
      fileRef,
      sanitizeField(company?.mol_establishment_id),
      sanitizeField(company?.company_bank_name),
    ].join(TAB),
  );

  lines.push(
    [
      "REC",
      "[59-NAME]",
      "[MOL-ID]",
      "[59-ACC]",
      "[57-BANK]",
      "[NATIONALITY]",
      "[MOL-BAS]",
      "[MOL-DED]",
      "[MOL-OEA]",
      "[32B-AMT]",
      "[70-DET]",
      "[ACCRUAL-MONTH]",
      "[JOB-TITLE]",
    ].join(TAB),
  );

  employeeRows.forEach((row, index) => {
    lines.push(
      [
        "REC",
        row.employeeName,
        row.governmentId,
        row.iban,
        row.bankCode,
        row.nationality,
        formatWpsAmount(row.basicSalary),
        formatWpsAmount(row.totalDeductions),
        formatWpsAmount(row.otherEarnings),
        formatWpsAmount(row.netAmount),
        row.paymentDescription,
        row.accrualMonth,
        row.jobTitle,
        String(index + 1),
      ].join(TAB),
    );
  });

  lines.push(["FTR", "[32A-AMT]", "[REC-COUNT]"].join(TAB));
  lines.push(
    ["FTR", formatWpsAmount(totalNet), String(employeeRows.length)].join(TAB),
  );
  lines.push("-");

  return {
    content: `${lines.join("\n")}\n`,
    totalNet,
    recordCount: employeeRows.length,
    fileRef,
    valueDate,
    employeeRows,
  };
}

export function downloadWpsSifFile({ company, records, payrollMonth }) {
  const { content } = buildWpsSifContent({ company, records, payrollMonth });
  const [monthPart, yearPart] = String(payrollMonth).split("/");
  const fileName =
    monthPart && yearPart
      ? `wps-${monthPart}-${yearPart}.sif`
      : "wps-payroll.sif";

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
