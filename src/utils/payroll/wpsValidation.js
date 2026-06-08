import { isSaudiNational } from "./gosi.js";

const SAUDI_IBAN_PATTERN = /^SA[0-9]{22}$/;

export function normalizeIban(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isValidSaudiIban(value) {
  const iban = normalizeIban(value);
  return iban.length === 24 && SAUDI_IBAN_PATTERN.test(iban);
}

export function extractSaudiBankCodeFromIban(value) {
  const iban = normalizeIban(value);
  if (!isValidSaudiIban(iban)) return "";
  return iban.slice(4, 8).replace(/^0+/, "") || iban.slice(4, 6);
}

function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function resolveEmployeeIsSaudi(employee) {
  if (employee?.is_saudi != null) {
    return employee.is_saudi === true;
  }
  return isSaudiNational(employee);
}

export function resolveEmployeeGovernmentId(employee) {
  const isSaudi = resolveEmployeeIsSaudi(employee);
  const idNumber = String(employee?.id_number ?? "").trim();
  const iqamaNumber = String(employee?.iqama_number ?? "").trim();
  return isSaudi ? idNumber : iqamaNumber;
}

export function computePayrollAmounts(record) {
  const basic = safeAmount(record.basic_salary);
  const housing = safeAmount(record.housing_allowance);
  const transport = safeAmount(record.transport_allowance);
  const otherAllowances = safeAmount(
    record.other_allowances ?? record.allowances,
  );
  const commissions = safeAmount(record.commissions);
  const additional = safeAmount(record.additional);

  const gosi = safeAmount(record.gosi_deduction ?? record.gosi);
  const penalties = safeAmount(record.penalty_deductions ?? record.penalties);
  const lateness = safeAmount(
    record.delay_deductions ?? record.lateness_deduction ?? record.delays,
  );
  const loans = safeAmount(record.loan_deductions);

  const otherEarnings =
    housing + transport + otherAllowances + commissions + additional;
  const gross = basic + otherEarnings;
  const totalDeductions = gosi + penalties + lateness + loans;
  const net = safeAmount(record.net_salary ?? record.net);

  return {
    basic,
    housing,
    transport,
    otherAllowances,
    commissions,
    additional,
    otherEarnings,
    gross,
    totalDeductions,
    net,
  };
}

function buildDuplicateIbanMap(records) {
  const ibanOwners = new Map();

  for (const record of records) {
    const employee = record.employees ?? {};
    const iban = normalizeIban(employee.iban);
    if (!iban) continue;

    const owners = ibanOwners.get(iban) ?? [];
    owners.push({
      employeeId: record.employee_id ?? employee.id,
      employeeName: employee.full_name ?? record.employee_name ?? "",
    });
    ibanOwners.set(iban, owners);
  }

  const duplicates = new Map();
  for (const [iban, owners] of ibanOwners.entries()) {
    if (owners.length > 1) {
      duplicates.set(iban, owners);
    }
  }

  return duplicates;
}

/**
 * @param {object} params
 * @param {object} params.company
 * @param {Array} params.records
 * @param {number} [params.warningRatio=0.5]
 */
export function checkWpsReadiness({ company, records, warningRatio = 0.5 }) {
  const companyBlockers = [];
  const employeeResults = [];
  const warnings = [];

  const companyIban = normalizeIban(company?.company_iban);
  const companyBankName = String(company?.company_bank_name ?? "").trim();

  if (!companyIban || !isValidSaudiIban(companyIban)) {
    companyBlockers.push("آيبان المنشأة غير صالح أو غير مكتمل");
  }
  if (!companyBankName) {
    companyBlockers.push("اسم بنك المنشأة غير مكتمل");
  }

  const duplicateIbans = buildDuplicateIbanMap(records);
  const ratio =
    Number.isFinite(Number(warningRatio)) && Number(warningRatio) > 0
      ? Number(warningRatio)
      : 0.5;

  for (const record of records) {
    const employee = record.employees ?? {};
    const employeeName = employee.full_name ?? record.employee_name ?? "—";
    const employeeId = record.employee_id ?? employee.id ?? record.id;
    const blockers = [];
    const employeeWarnings = [];

    const iban = normalizeIban(employee.iban);
    if (!iban) {
      blockers.push("الآيبان");
    } else if (!isValidSaudiIban(iban)) {
      blockers.push("الآيبان (صيغة غير صالحة)");
    } else if (duplicateIbans.has(iban)) {
      blockers.push("الآيبان مكرر لموظفين آخرين");
    }

    const governmentId = resolveEmployeeGovernmentId(employee);
    if (!governmentId) {
      blockers.push(
        resolveEmployeeIsSaudi(employee)
          ? "رقم الهوية الوطنية"
          : "رقم الإقامة",
      );
    }

    const amounts = computePayrollAmounts(record);
    if (amounts.net <= 0) {
      blockers.push("الصافي يجب أن يكون أكبر من صفر");
    }

    if (
      amounts.gross > 0 &&
      amounts.net > 0 &&
      amounts.net / amounts.gross < ratio
    ) {
      const percent = Math.round(ratio * 100);
      employeeWarnings.push(
        `صافي ${employeeName} أقل من ${percent}% من الإجمالي، قد يُرفض`,
      );
    }

    employeeResults.push({
      employeeId,
      employeeName,
      iban,
      governmentId,
      nationality: employee.nationality ?? "",
      jobTitle: employee.job_title_name ?? "",
      amounts,
      blockers,
      warnings: employeeWarnings,
      isReady: blockers.length === 0,
    });

    warnings.push(...employeeWarnings);
  }

  const readyCount = employeeResults.filter((row) => row.isReady).length;
  const blockedCount = employeeResults.length - readyCount;
  const hasCompanyBlockers = companyBlockers.length > 0;
  const hasEmployeeBlockers = blockedCount > 0;

  return {
    isReady: !hasCompanyBlockers && !hasEmployeeBlockers && records.length > 0,
    companyBlockers,
    companyMessage: hasCompanyBlockers
      ? "أكمل بيانات بنك المنشأة أولاً"
      : null,
    employees: employeeResults,
    readyCount,
    blockedCount,
    totalCount: employeeResults.length,
    warnings,
    duplicateIbans: Array.from(duplicateIbans.entries()).map(([iban, owners]) => ({
      iban,
      owners,
    })),
    warningRatio: ratio,
  };
}
