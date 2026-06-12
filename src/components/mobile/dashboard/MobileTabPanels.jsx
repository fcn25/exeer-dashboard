import { CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Star } from "lucide-react";
import { normalizeTaskStatus } from "../../../utils/taskStatus.js";
import {
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  ICON_CHIP,
  MOBILE_CARD,
  TYPE_ITEM,
  TYPE_META,
} from "../../home/homeStyles.js";
import { TabListSkeleton } from "./MobileDashboardSkeleton.jsx";

function EmptyState({ message }) {
  return (
    <div className={`${MOBILE_CARD} px-4 py-10 text-center`}>
      <p className={TYPE_META}>{message}</p>
    </div>
  );
}

function RequestRow({ item }) {
  return (
    <div className={HOME_LIST_ITEM}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${TYPE_ITEM} truncate`}>{item.employee}</p>
          <p className={`${TYPE_META} mt-0.5 truncate`}>{item.type}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {item.status}
        </span>
      </div>
      <p className={`${TYPE_META} mt-2`}>{item.date}</p>
    </div>
  );
}

function TaskRow({ item, onSubmitForReview, updatingTaskId }) {
  const canSubmitForReview =
    normalizeTaskStatus(item.status) === "قيد التنفيذ" && Boolean(onSubmitForReview);

  return (
    <div className={HOME_LIST_ITEM}>
      <div className="flex items-start gap-3">
        <span className={ICON_CHIP}>
          <ClipboardList className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${TYPE_ITEM} truncate`}>{item.title}</p>
          <div className={`${TYPE_META} mt-1.5 flex flex-wrap gap-2`}>
            <span className="rounded-full bg-[#F7F6F3] px-2 py-0.5 dark:bg-[var(--bg-surface-hover)]">
              {item.status}
            </span>
            {item.deadline ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {item.deadline}
              </span>
            ) : null}
          </div>
        </div>
        {canSubmitForReview ? (
          <button
            type="button"
            disabled={updatingTaskId === item.id}
            onClick={() => onSubmitForReview(item.id)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            aria-label="تأكيد إنجاز المهمة"
            title="تأكيد الإنجاز"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EvaluationRow({ item }) {
  return (
    <div className={HOME_LIST_ITEM}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${TYPE_ITEM} truncate`}>{item.title}</p>
          <p className={`${TYPE_META} mt-0.5`}>
            {item.employee ? `${item.employee} · ${item.cycle}` : item.cycle}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            ينتهي {item.due}
          </p>
        </div>
      </div>
    </div>
  );
}

function AchievementRow({ item }) {
  return (
    <div className={HOME_LIST_ITEM}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Star className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${TYPE_ITEM} truncate`}>{item.title}</p>
          <p className={`${TYPE_META} mt-1`}>{item.date}</p>
        </div>
      </div>
    </div>
  );
}

function LogRow({ item }) {
  return (
    <div className={HOME_LIST_ITEM}>
      <p className={`${TYPE_ITEM} truncate`}>{item.title}</p>
      <p className={`${TYPE_META} mt-0.5`}>{item.employee}</p>
      <p className={`${TYPE_META} mt-1.5`}>{item.date}</p>
    </div>
  );
}

const EMPTY_MESSAGES = {
  requests: "لا توجد طلبات لعرضها حالياً.",
  tasks: "لا توجد مهام معلقة حالياً.",
  evaluations: "لا توجد تقييمات مطلوبة حالياً.",
  achievements: "لم تُسجّل إنجازات بعد.",
  logs: "لا توجد سجلات إدارية لعرضها.",
};

export default function MobileTabPanels({
  activeTab,
  data,
  isLoading,
  onTaskSubmitForReview,
  updatingTaskId,
}) {
  if (isLoading) {
    return <TabListSkeleton />;
  }

  const lists = {
    requests: data?.requests,
    tasks: data?.tasks,
    evaluations: data?.evaluations,
    achievements: data?.achievements,
    logs: data?.logs,
  };

  const items = lists[activeTab] ?? [];

  if (!items.length) {
    return <EmptyState message={EMPTY_MESSAGES[activeTab] ?? "لا توجد عناصر لعرضها حالياً."} />;
  }

  return (
    <div className={MOBILE_CARD}>
      <div className={HOME_LIST_DIVIDE}>
        {activeTab === "requests" &&
          items.map((item) => <RequestRow key={item.id} item={item} />)}
        {activeTab === "tasks" &&
          items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              onSubmitForReview={onTaskSubmitForReview}
              updatingTaskId={updatingTaskId}
            />
          ))}
        {activeTab === "evaluations" &&
          items.map((item) => <EvaluationRow key={item.id} item={item} />)}
        {activeTab === "achievements" &&
          items.map((item) => <AchievementRow key={item.id} item={item} />)}
        {activeTab === "logs" &&
          items.map((item) => <LogRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
