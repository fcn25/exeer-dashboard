function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * On-demand sync net (accounting): base + housing minus synced deductions.
 */
export function calculateSafeProtocolNetSalary(record) {
  const gross =
    safeAmount(record.basic_salary) +
    safeAmount(record.housing_allowance);

  const deductions =
    safeAmount(record.delay_deductions ?? record.lateness_deduction ?? record.delays) +
    safeAmount(record.penalty_deductions ?? record.penalties) +
    safeAmount(record.loan_deductions);

  return roundMoney(gross - deductions);
}

/**
 * Draft / generate net: includes other allowances, commissions, and GOSI.
 */
export function calculatePayrollNetSalary(record) {
  const gross =
    safeAmount(record.basic_salary) +
    safeAmount(record.housing_allowance) +
    safeAmount(record.other_allowances ?? record.allowances) +
    safeAmount(record.commissions) +
    safeAmount(record.additional);

  const deductions =
    safeAmount(record.delay_deductions ?? record.lateness_deduction ?? record.delays) +
    safeAmount(record.penalty_deductions ?? record.penalties) +
    safeAmount(record.loan_deductions) +
    safeAmount(record.gosi_deduction ?? record.gosi);

  return roundMoney(gross - deductions);
}

