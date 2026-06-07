import {
  FileText,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

export const SMART_INTERVIEW_ID = "smart-interview";
export const SMART_TASK_ID = "smart-task";
export const SMART_GOALS_ID = "smart-goals";
export const ACHIEVEMENTS_RECORD_ID = "achievements-record";
export const MONTHLY_REPORT_ID = "monthly-report";
export const MANAGEMENT_ADVISOR_ID = "management-advisor";

/** Set to true when Gemini-powered smart tools are ready again. */
export const SMART_GEMINI_FEATURES_ENABLED = false;

const GEMINI_POWERED_TOOL_IDS = new Set([
  SMART_TASK_ID,
  SMART_INTERVIEW_ID,
  SMART_GOALS_ID,
  MONTHLY_REPORT_ID,
]);

export function isSmartToolTemporarilyDisabled(toolId) {
  if (SMART_GEMINI_FEATURES_ENABLED) return false;
  return GEMINI_POWERED_TOOL_IDS.has(toolId);
}

export const SMART_TOOLS = [
  {
    id: SMART_TASK_ID,
    label: "المهام الذكية",
    description: "اقتراح مهام وتكليفات بمساعدة الذكاء الاصطناعي",
    icon: Sparkles,
  },
  {
    id: SMART_INTERVIEW_ID,
    label: "المقابلة الذكية",
    description: "أسئلة مقابلات مخصّصة حسب الوظيفة",
    icon: MessageSquare,
  },
  {
    id: MANAGEMENT_ADVISOR_ID,
    label: "المستشار الإداري",
    description: "مشورة إدارية سريعة لقرارات الموارد البشرية",
    icon: Lightbulb,
  },
  {
    id: SMART_GOALS_ID,
    label: "الأهداف الذكية",
    description: "صياغة أهداف قابلة للقياس للفريق",
    icon: Target,
  },
  {
    id: ACHIEVEMENTS_RECORD_ID,
    label: "سجل الإنجازات",
    description: "أرشيف إنجازات الموظفين والتقدير",
    icon: Trophy,
  },
  {
    id: MONTHLY_REPORT_ID,
    label: "التقرير الشهري",
    description: "ملخص شهري مدعوم بالذكاء الاصطناعي",
    icon: FileText,
  },
];
