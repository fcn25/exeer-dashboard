const WORK_DAYS_PER_MONTH = 30;
const WORK_HOURS_PER_DAY = 8;
const WORK_MINUTES_PER_DAY = WORK_HOURS_PER_DAY * 60;

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Monetary deductions from attendance aggregates (based on basic salary).
 */
export function calculateAttendanceDeductions({
  basicSalary,
  totalDelayMinutes = 0,
  absenceDays = 0,
}) {
  const basic = Number(basicSalary) || 0;
  const dailyRate = basic / WORK_DAYS_PER_MONTH;
  const minuteRate = dailyRate / WORK_MINUTES_PER_DAY;

  const latenessDeduction = roundMoney(
    minuteRate * Math.max(0, Number(totalDelayMinutes) || 0),
  );
  const absencePenalty = roundMoney(
    dailyRate * Math.max(0, Number(absenceDays) || 0),
  );

  return {
    latenessDeduction,
    absencePenalty,
    totalDeduction: roundMoney(latenessDeduction + absencePenalty),
  };
}

export function recalculatePayrollNet({
  basicSalary = 0,
  housingAllowance = 0,
  otherAllowances = 0,
  commissions = 0,
  additional = 0,
  penalties = 0,
  gosiDeduction = 0,
  latenessDeduction = 0,
}) {
  const gross =
    Number(basicSalary) +
    Number(housingAllowance) +
    Number(otherAllowances) +
    Number(commissions) +
    Number(additional);
  const deductions =
    Number(penalties) + Number(gosiDeduction) + Number(latenessDeduction);
  return roundMoney(gross - deductions);
}
