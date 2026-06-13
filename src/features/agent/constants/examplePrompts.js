import { Eye, Pencil } from "lucide-react";

/** @typedef {{ id: string; text: string; icon: import("lucide-react").LucideIcon; kind: "read" | "write" }} ExamplePrompt */

/** @type {Record<string, ExamplePrompt[]>} */
export const EXAMPLE_PROMPTS_BY_ROLE = {
  owner: [
    {
      id: "owner-1",
      text: "غيّر مسمى أحمد الحربي إلى «مدير مبيعات أول»",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "owner-2",
      text: "اعرض ملخص حضور الفريق هذا الأسبوع",
      icon: Eye,
      kind: "read",
    },
    {
      id: "owner-3",
      text: "ما الطلبات المعلقة التي تحتاج موافقتي؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "owner-4",
      text: "أضف إجازة سنوية لموظف رقم 1042",
      icon: Pencil,
      kind: "write",
    },
  ],
  Executive: [
    {
      id: "exec-1",
      text: "اعرض مؤشرات الأداء للربع الحالي",
      icon: Eye,
      kind: "read",
    },
    {
      id: "exec-2",
      text: "من هم الموظفون الأكثر تأخيراً هذا الشهر؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "exec-3",
      text: "وافق على طلب الإجازة لسارة العتيبي",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "exec-4",
      text: "اعرض العقود التي تنتهي خلال 30 يوماً",
      icon: Eye,
      kind: "read",
    },
  ],
  HR_Manager: [
    {
      id: "hrm-1",
      text: "غيّر مسمى موظف رقم 1042 إلى «محلل موارد بشرية»",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "hrm-2",
      text: "اعرض العقود التي تنتهي خلال 30 يوماً",
      icon: Eye,
      kind: "read",
    },
    {
      id: "hrm-3",
      text: "سجّل إجراء إداري لموظف متأخر",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "hrm-4",
      text: "كم عدد الموظفين النشطين؟",
      icon: Eye,
      kind: "read",
    },
  ],
  HR_Assistant: [
    {
      id: "hra-1",
      text: "اعرض قائمة الموظفين الجدد هذا الشهر",
      icon: Eye,
      kind: "read",
    },
    {
      id: "hra-2",
      text: "حدّث رقم جوال موظف رقم 1042",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "hra-3",
      text: "ما حالة طلبات التدريب المعلقة؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "hra-4",
      text: "أرسل تذكيراً بانتهاء فترة التجربة",
      icon: Pencil,
      kind: "write",
    },
  ],
  Direct_Manager: [
    {
      id: "dm-1",
      text: "اعرض طلبات فريقي المعلقة",
      icon: Eye,
      kind: "read",
    },
    {
      id: "dm-2",
      text: "غيّر مسمى فهد المطيري إلى «مشرف مبيعات»",
      icon: Pencil,
      kind: "write",
    },
    {
      id: "dm-3",
      text: "من حضر اليوم من فريقي؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "dm-4",
      text: "سجّل ملاحظة أداء لموظف في فريقي",
      icon: Pencil,
      kind: "write",
    },
  ],
  Accountant: [
    {
      id: "acc-1",
      text: "اعرض ملخص مسير الرواتب لهذا الشهر",
      icon: Eye,
      kind: "read",
    },
    {
      id: "acc-2",
      text: "ما إجمالي الخصومات هذا الشهر؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "acc-3",
      text: "أضف بدل انتقال لموظف رقم 1042",
      icon: Pencil,
      kind: "write",
    },
  ],
  Employee: [
    {
      id: "emp-1",
      text: "اعرض رصيد إجازاتي",
      icon: Eye,
      kind: "read",
    },
    {
      id: "emp-2",
      text: "ما حالة طلباتي المعلقة؟",
      icon: Eye,
      kind: "read",
    },
    {
      id: "emp-3",
      text: "قدّم طلب إجازة ليومين",
      icon: Pencil,
      kind: "write",
    },
  ],
};

export function getExamplesForRole(role) {
  return EXAMPLE_PROMPTS_BY_ROLE[role] ?? EXAMPLE_PROMPTS_BY_ROLE.Direct_Manager;
}
