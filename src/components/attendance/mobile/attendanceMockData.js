export const MOCK_TODAY_ATTENDANCE = {
  lastPunch: {
    time: "08:30 ص",
    type: "check_in",
    typeLabel: "تسجيل حضور",
  },
  nextPunchType: "check_out",
  nextPunchLabel: "تسجيل انصراف",
  workingMinutes: 285,
  delayMinutes: 12,
  expectedCheckIn: "08:15 ص",
  status: "on_time",
};

export const MOCK_MONTHLY_RECORDS = [
  {
    id: "2025-06-05",
    date: "2025-06-05",
    dayLabel: "الخميس",
    dateLabel: "5 يونيو",
    checkIn: "08:22 ص",
    checkOut: "05:15 م",
    workingHours: "8س 53د",
    delayMinutes: 7,
    status: "present",
  },
  {
    id: "2025-06-04",
    date: "2025-06-04",
    dayLabel: "الأربعاء",
    dateLabel: "4 يونيو",
    checkIn: "08:10 ص",
    checkOut: "05:02 م",
    workingHours: "8س 52د",
    delayMinutes: 0,
    status: "present",
  },
  {
    id: "2025-06-03",
    date: "2025-06-03",
    dayLabel: "الثلاثاء",
    dateLabel: "3 يونيو",
    checkIn: "08:45 ص",
    checkOut: "05:30 م",
    workingHours: "8س 45د",
    delayMinutes: 30,
    status: "late",
  },
  {
    id: "2025-06-02",
    date: "2025-06-02",
    dayLabel: "الاثنين",
    dateLabel: "2 يونيو",
    checkIn: "08:05 ص",
    checkOut: "04:55 م",
    workingHours: "8س 50د",
    delayMinutes: 0,
    status: "present",
  },
  {
    id: "2025-06-01",
    date: "2025-06-01",
    dayLabel: "الأحد",
    dateLabel: "1 يونيو",
    checkIn: null,
    checkOut: null,
    workingHours: "—",
    delayMinutes: 0,
    status: "leave",
    statusLabel: "إجازة",
  },
  {
    id: "2025-05-29",
    date: "2025-05-29",
    dayLabel: "الخميس",
    dateLabel: "29 مايو",
    checkIn: "08:18 ص",
    checkOut: "05:10 م",
    workingHours: "8س 52د",
    delayMinutes: 3,
    status: "present",
  },
  {
    id: "2025-05-28",
    date: "2025-05-28",
    dayLabel: "الأربعاء",
    dateLabel: "28 مايو",
    checkIn: "08:12 ص",
    checkOut: "05:00 م",
    workingHours: "8س 48د",
    delayMinutes: 0,
    status: "present",
  },
];

export function formatWorkingDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0د";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}د`;
  if (minutes === 0) return `${hours}س`;
  return `${hours}س ${minutes}د`;
}
