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

export const SMART_TOOLS = [
  { id: SMART_TASK_ID, label: "المهام الذكية", icon: Sparkles },
  { id: SMART_INTERVIEW_ID, label: "المقابلة الذكية", icon: MessageSquare },
  {
    id: MANAGEMENT_ADVISOR_ID,
    label: "المستشار الإداري",
    icon: Lightbulb,
  },
  { id: SMART_GOALS_ID, label: "الأهداف الذكية", icon: Target },
  { id: ACHIEVEMENTS_RECORD_ID, label: "سجل الإنجازات", icon: Trophy },
  { id: MONTHLY_REPORT_ID, label: "التقرير الشهري", icon: FileText },
];
