export const ADMIN_BENTO_STATS = [
  {
    id: "pending-tasks",
    value: "12",
    label: "مهام معلقة",
    accent: "text-exeer-primary",
    bg: "bg-slate-50",
    span: 1,
  },
  {
    id: "pending-requests",
    value: "7",
    label: "طلبات بانتظار الموافقة",
    accent: "text-blue-700",
    bg: "bg-blue-50/80",
    span: 1,
  },
  {
    id: "achievements",
    value: "48",
    label: "إنجازات الفريق",
    accent: "text-amber-700",
    bg: "bg-amber-50/80",
    span: 1,
  },
  {
    id: "leave-balance",
    value: "3",
    label: "طلبات إجازة معلقة",
    accent: "text-emerald-700",
    bg: "bg-emerald-50/80",
    span: 1,
  },
];

export const EMPLOYEE_BENTO_STATS = [
  {
    id: "today-hours",
    value: "4س 45د",
    label: "ساعات اليوم",
    accent: "text-emerald-700",
    bg: "bg-emerald-50/80",
    span: 1,
  },
  {
    id: "pending-requests",
    value: "2",
    label: "طلبات معلقة",
    accent: "text-blue-700",
    bg: "bg-blue-50/80",
    span: 1,
  },
  {
    id: "pending-tasks",
    value: "3",
    label: "مهام معلقة",
    accent: "text-exeer-primary",
    bg: "bg-slate-50",
    span: 1,
  },
  {
    id: "leave-balance",
    value: "14",
    label: "رصيد الإجازات (يوم)",
    accent: "text-violet-700",
    bg: "bg-violet-50/80",
    span: 1,
  },
];

export const MOCK_ADMIN_REQUESTS = [
  {
    id: "r1",
    employee: "سارة العتيبي",
    type: "إجازة سنوية",
    status: "قيد المراجعة",
    date: "5 يونيو",
  },
  {
    id: "r2",
    employee: "خالد المنصور",
    type: "سلفة مالية",
    status: "قيد المراجعة",
    date: "4 يونيو",
  },
  {
    id: "r3",
    employee: "نورة الحربي",
    type: "استئذان",
    status: "جديد",
    date: "4 يونيو",
  },
];

export const MOCK_EMPLOYEE_REQUESTS = [
  {
    id: "er1",
    employee: "أنت",
    type: "إجازة",
    status: "قيد المراجعة",
    date: "2 يونيو",
  },
  {
    id: "er2",
    employee: "أنت",
    type: "طلب عام",
    status: "موافق",
    date: "28 مايو",
  },
];

export const MOCK_ADMIN_TASKS = [
  {
    id: "t1",
    title: "مراجعة سياسة الحضور",
    status: "قيد التنفيذ",
    deadline: "8 يونيو",
  },
  {
    id: "t2",
    title: "إعداد تقرير الربع الثاني",
    status: "قيد الانتظار",
    deadline: "12 يونيو",
  },
  {
    id: "t3",
    title: "متابعة طلبات الإجازة",
    status: "قيد الانتظار",
    deadline: "6 يونيو",
  },
];

export const MOCK_EMPLOYEE_TASKS = [
  {
    id: "et1",
    title: "تحديث ملف العميل — مرحلة التسليم",
    status: "قيد التنفيذ",
    deadline: "7 يونيو",
  },
  {
    id: "et2",
    title: "إعداد عرض تقديمي للفريق",
    status: "قيد الانتظار",
    deadline: "10 يونيو",
  },
];

export const MOCK_EVALUATIONS = [
  {
    id: "e1",
    title: "تقييم الأداء الربعي",
    cycle: "دورة Q2 2025",
    due: "15 يونيو",
  },
  {
    id: "e2",
    title: "تقييم المدير المباشر",
    cycle: "دورة Q2 2025",
    due: "20 يونيو",
  },
];

export const MOCK_ACHIEVEMENTS = [
  {
    id: "a1",
    title: "إتمام مشروع التحول الرقمي",
    date: "3 يونيو",
  },
  {
    id: "a2",
    title: "تقليل زمن الاستجابة بنسبة 30%",
    date: "22 مايو",
  },
];

export const MOCK_ADMIN_LOGS = [
  {
    id: "l1",
    title: "إجراء إداري — تنبيه",
    employee: "أحمد الشمري",
    date: "5 يونيو",
  },
  {
    id: "l2",
    title: "إجراء إداري — إنذار",
    employee: "فهد القحطاني",
    date: "1 يونيو",
  },
];

export const ADMIN_TABS = [
  { id: "requests", label: "الطلبات" },
  { id: "tasks", label: "المهام" },
  { id: "evaluations", label: "التقييمات" },
  { id: "logs", label: "السجل" },
];

export const EMPLOYEE_TABS = [
  { id: "requests", label: "الطلبات" },
  { id: "tasks", label: "المهام" },
  { id: "evaluations", label: "التقييمات" },
  { id: "achievements", label: "الإنجازات" },
];

export const ADMIN_FAB_ACTIONS = [
  { id: "new-request", label: "طلب جديد", description: "إنشاء طلب للموظفين" },
  { id: "add-task", label: "إضافة مهمة", description: "تعيين مهمة جديدة" },
  { id: "launch-eval", label: "إطلاق تقييم", description: "بدء دورة تقييم" },
  { id: "admin-action", label: "إجراء إداري", description: "إصدار إجراء جديد" },
];

export const EMPLOYEE_FAB_ACTIONS = [
  { id: "new-request", label: "طلب جديد", description: "تقديم طلب إجازة أو عام" },
  { id: "add-achievement", label: "إضافة إنجاز", description: "تسجيل إنجاز مهني" },
  { id: "permission", label: "استئذان", description: "طلب استئذان سريع" },
];
