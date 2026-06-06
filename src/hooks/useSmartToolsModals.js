import { useCallback, useState } from "react";
import {
  ACHIEVEMENTS_RECORD_ID,
  MANAGEMENT_ADVISOR_ID,
  MONTHLY_REPORT_ID,
  SMART_GOALS_ID,
  SMART_INTERVIEW_ID,
  SMART_TASK_ID,
} from "../constants/smartTools.js";

export function useSmartToolsModals() {
  const [isSmartInterviewOpen, setIsSmartInterviewOpen] = useState(false);
  const [isSmartTasksOpen, setIsSmartTasksOpen] = useState(false);
  const [isSmartGoalsOpen, setIsSmartGoalsOpen] = useState(false);
  const [isAchievementsArchiveOpen, setIsAchievementsArchiveOpen] =
    useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);

  const resolveToolAction = useCallback((toolId) => {
    if (toolId === SMART_INTERVIEW_ID) {
      return () => setIsSmartInterviewOpen(true);
    }
    if (toolId === SMART_TASK_ID) {
      return () => setIsSmartTasksOpen(true);
    }
    if (toolId === SMART_GOALS_ID) {
      return () => setIsSmartGoalsOpen(true);
    }
    if (toolId === ACHIEVEMENTS_RECORD_ID) {
      return () => setIsAchievementsArchiveOpen(true);
    }
    if (toolId === MONTHLY_REPORT_ID) {
      return () => setIsMonthlyReportOpen(true);
    }
    if (toolId === MANAGEMENT_ADVISOR_ID) {
      return undefined;
    }
    return undefined;
  }, []);

  const modalProps = {
    isSmartInterviewOpen,
    onCloseSmartInterview: () => setIsSmartInterviewOpen(false),
    isSmartTasksOpen,
    onCloseSmartTasks: () => setIsSmartTasksOpen(false),
    isSmartGoalsOpen,
    onCloseSmartGoals: () => setIsSmartGoalsOpen(false),
    isAchievementsArchiveOpen,
    onCloseAchievementsArchive: () => setIsAchievementsArchiveOpen(false),
    isMonthlyReportOpen,
    onCloseMonthlyReport: () => setIsMonthlyReportOpen(false),
  };

  return { resolveToolAction, modalProps };
}
