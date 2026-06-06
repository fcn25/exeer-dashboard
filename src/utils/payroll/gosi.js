/**
 * Saudi GOSI employee deduction rates on (basic_salary + housing_allowance).
 * Reference date: last day of the payroll month.
 */

const GOSI_SCHEDULE = [
  { start: new Date("2028-07-01T00:00:00"), rate: 0.11 },
  { start: new Date("2027-07-01T00:00:00"), rate: 0.105 },
  { start: new Date("2026-07-01T00:00:00"), rate: 0.1 },
  { start: new Date("2025-07-01T00:00:00"), rate: 0.095 },
  { start: new Date(0), rate: 0.09 },
];

export function isSaudiNational(employee) {
  if (!employee || typeof employee !== "object") return false;

  const nationality = String(employee.nationality ?? "")
    .trim()
    .toLowerCase();

  return (
    nationality.includes("سعود") ||
    nationality.includes("saudi") ||
    nationality === "sa" ||
    nationality === "ksa"
  );
}

export function getGosiRateForDate(referenceDate) {
  const date =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (Number.isNaN(date.getTime())) {
    return GOSI_SCHEDULE[GOSI_SCHEDULE.length - 1].rate;
  }

  for (const bracket of GOSI_SCHEDULE) {
    if (date >= bracket.start) {
      return bracket.rate;
    }
  }

  return 0.09;
}

/** @param {string} payrollMonth MM/YYYY */
export function getPayrollMonthEndDate(payrollMonth) {
  const [monthStr, yearStr] = String(payrollMonth).split("/");
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!month || !year) {
    return new Date();
  }

  return new Date(year, month, 0);
}

export function getGosiRateForPayrollMonth(payrollMonth) {
  return getGosiRateForDate(getPayrollMonthEndDate(payrollMonth));
}

export function calculateGosiDeduction({
  basicSalary,
  housingAllowance,
  employee,
  payrollMonth,
  referenceDate,
}) {
  if (!isSaudiNational(employee)) {
    return { amount: 0, rate: 0, applicable: false };
  }

  const base = Number(basicSalary) + Number(housingAllowance);
  const rate = referenceDate
    ? getGosiRateForDate(referenceDate)
    : getGosiRateForPayrollMonth(payrollMonth);

  const amount = roundMoney(base * rate);

  return { amount, rate, applicable: true };
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatGosiRatePercent(rate) {
  return `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
}
