/** Calendar bounds for a payroll month picker value (yyyy-MM). */
export function getMonthBoundsFromPicker(pickerValue) {
  const [year, month] = String(pickerValue).split("-").map(Number);
  if (!year || !month) return null;

  const monthPadded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();

  return {
    year,
    month,
    dateFrom: `${year}-${monthPadded}-01`,
    dateTo: `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`,
    rangeStartIso: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
    rangeEndIso: new Date(year, month - 1, lastDay, 23, 59, 59, 999).toISOString(),
  };
}
