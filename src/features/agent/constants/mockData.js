/** Mock confirmation card payload for demo job-title change */
export const MOCK_JOB_TITLE_CHANGE = {
  employeeId: 1042,
  employeeName: "فهد المطيري",
  department: "المبيعات",
  currentTitle: "مندوب مبيعات",
  newTitle: "مشرف مبيعات",
  initials: "فم",
};

/** @typedef {{ id: string; text: string; kind: "read" | "write"; status: "executed" | "view" }} HistoryItem */
/** @typedef {{ dateLabel: string; items: HistoryItem[] }} HistoryGroup */

/** @type {HistoryGroup[]} */
export const MOCK_COMMAND_HISTORY = [
  {
    dateLabel: "اليوم",
    items: [
      {
        id: "h-today-1",
        text: "غيّر مسمى فهد المطيري إلى «مشرف مبيعات»",
        kind: "write",
        status: "executed",
      },
      {
        id: "h-today-2",
        text: "اعرض طلبات فريقي المعلقة",
        kind: "read",
        status: "view",
      },
    ],
  },
  {
    dateLabel: "أمس",
    items: [
      {
        id: "h-yesterday-1",
        text: "كم عدد الموظفين النشطين؟",
        kind: "read",
        status: "view",
      },
      {
        id: "h-yesterday-2",
        text: "سجّل إجراء إداري لموظف متأخر",
        kind: "write",
        status: "executed",
      },
    ],
  },
  {
    dateLabel: "٣ يونيو ٢٠٢٦",
    items: [
      {
        id: "h-older-1",
        text: "اعرض العقود التي تنتهي خلال 30 يوماً",
        kind: "read",
        status: "view",
      },
    ],
  },
];
