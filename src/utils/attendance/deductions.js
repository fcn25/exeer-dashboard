const WORK_DAYS_PER_MONTH = 30;
const WORK_HOURS_PER_DAY = 8;
const WORK_MINUTES_PER_DAY = WORK_HOURS_PER_DAY * 60;

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Saudi labor standard: delay deduction from basic salary per minute late.
 * delay_deductions = (base_salary / 30 / 8 / 60) * total_delay_minutes
 */
export function calculateDelayDeduction({ baseSalary, totalDelayMinutes = 0 }) {
  const basic = Number(baseSalary) || 0;
  const minutes = Math.max(0, Number(totalDelayMinutes) || 0);
  const perMinuteRate = basic / WORK_DAYS_PER_MONTH / WORK_HOURS_PER_DAY / 60;
  return roundMoney(perMinuteRate * minutes);
}

export function resolveEmployeeBaseSalary(employee) {
  return (
    Number(employee?.base_salary ?? employee?.basic_salary) || 0
  );
}

export function recalculatePayrollNet({
  basicSalary = 0,
  housingAllowance = 0,
  otherAllowances = 0,
  commissions = 0,
  additional = 0,
  penaltyDeduction = 0,
  delayDeduction = 0,
  gosiDeduction = 0,
  /** @deprecated use penaltyDeduction */
  penalties = 0,
  /** @deprecated use delayDeduction */
  latenessDeduction = 0,
}) {
  const gross =
    Number(basicSalary) +
    Number(housingAllowance) +
    Number(otherAllowances) +
    Number(commissions) +
    Number(additional);
  const penalty = Number(penaltyDeduction) || Number(penalties) || 0;
  const delay = Number(delayDeduction) || Number(latenessDeduction) || 0;
  const deductions = penalty + delay + Number(gosiDeduction);
  return roundMoney(gross - deductions);
}
