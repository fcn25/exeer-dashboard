/** Mock confirmation card payload for demo job-title change */
export const MOCK_JOB_TITLE_CHANGE = {
  employeeId: 1042,
  employeeName: "فهد المطيري",
  department: "المبيعات",
  currentTitle: "مندوب مبيعات",
  newTitle: "مشرف مبيعات",
  initials: "فم",
};

/** Mock employees for query-panel entity matching (layout wiring only) */
export const MOCK_SEARCH_EMPLOYEES = [
  {
    id: 1042,
    full_name: "فهد المطيري",
    job_title_name: "مندوب مبيعات",
    department: "المبيعات",
  },
  {
    id: 1018,
    full_name: "سارة العتيبي",
    job_title_name: "محلل موارد بشرية",
    department: "الموارد البشرية",
  },
  {
    id: 1003,
    full_name: "أحمد الحربي",
    job_title_name: "مدير مبيعات",
    department: "المبيعات",
  },
  {
    id: 1055,
    full_name: "نورة القحطاني",
    job_title_name: "محاسبة",
    department: "المالية",
  },
];

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
