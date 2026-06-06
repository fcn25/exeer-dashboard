import { lazy, Suspense } from "react";

const SmartInterviewModal = lazy(
  () => import("../SmartInterviewModal.jsx"),
);
const SmartGoalsModal = lazy(() => import("../SmartGoalsModal.jsx"));
const SmartTasksModal = lazy(() => import("../SmartTasksModal.jsx"));
const AchievementsArchiveModal = lazy(
  () => import("../achievements/AchievementsArchiveModal.jsx"),
);
const MonthlyReportModal = lazy(
  () => import("../MonthlyReportModal.jsx"),
);

export default function SmartToolsModals({
  isSmartInterviewOpen,
  onCloseSmartInterview,
  isSmartTasksOpen,
  onCloseSmartTasks,
  isSmartGoalsOpen,
  onCloseSmartGoals,
  isAchievementsArchiveOpen,
  onCloseAchievementsArchive,
  isMonthlyReportOpen,
  onCloseMonthlyReport,
}) {
  return (
    <Suspense fallback={null}>
      <SmartInterviewModal
        isOpen={isSmartInterviewOpen}
        onClose={onCloseSmartInterview}
      />
      <SmartTasksModal isOpen={isSmartTasksOpen} onClose={onCloseSmartTasks} />
      <SmartGoalsModal isOpen={isSmartGoalsOpen} onClose={onCloseSmartGoals} />
      <AchievementsArchiveModal
        isOpen={isAchievementsArchiveOpen}
        onClose={onCloseAchievementsArchive}
      />
      <MonthlyReportModal
        isOpen={isMonthlyReportOpen}
        onClose={onCloseMonthlyReport}
      />
    </Suspense>
  );
}
