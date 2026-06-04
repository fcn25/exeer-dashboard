export const ATTENDANCE_CSV_HEADERS = [
  "الرقم الوظيفي",
  "التاريخ",
  "دخول 1",
  "خروج 1",
  "دخول 2",
  "خروج 2",
  "الحالة",
  "دقائق التأخير",
];

const SAMPLE_ROWS = [
  ["1001", "01/06/2026", "08:00", "16:00", "", "", "حضور", "0"],
  ["1002", "01/06/2026", "08:15", "16:05", "", "", "حضور", "15"],
  ["1003", "01/06/2026", "", "", "", "", "غياب", "0"],
];

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildAttendanceTemplateCsv() {
  const lines = [
    ATTENDANCE_CSV_HEADERS.map(escapeCsvCell).join(","),
    ...SAMPLE_ROWS.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadAttendanceTemplateCsv() {
  const blob = new Blob([buildAttendanceTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Exeer_Attendance_Template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
