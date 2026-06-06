import { CalendarDays, ClipboardCheck, ClipboardList, Star } from "lucide-react";
import { TabListSkeleton } from "./MobileDashboardSkeleton.jsx";

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center shadow-sm">
      <p className="text-sm text-exeer-muted">{message}</p>
    </div>
  );
}

function RequestRow({ item }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-exeer-primary">{item.employee}</p>
          <p className="mt-0.5 text-xs text-exeer-muted">{item.type}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          {item.status}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-exeer-muted">{item.date}</p>
    </article>
  );
}

function TaskRow({ item }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-exeer-primary">
          <ClipboardList className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-exeer-muted">
            <span className="rounded-full bg-gray-50 px-2 py-0.5">{item.status}</span>
            {item.deadline ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {item.deadline}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EvaluationRow({ item }) {
  return (
    <article className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
          <p className="mt-0.5 text-xs text-exeer-muted">
            {item.employee ? `${item.employee} · ${item.cycle}` : item.cycle}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-amber-800">
            ينتهي {item.due}
          </p>
        </div>
      </div>
    </article>
  );
}

function AchievementRow({ item }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Star className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
          <p className="mt-1 text-[11px] text-exeer-muted">{item.date}</p>
        </div>
      </div>
    </article>
  );
}

function LogRow({ item }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
      <p className="mt-0.5 text-xs text-exeer-muted">{item.employee}</p>
      <p className="mt-1.5 text-[11px] text-exeer-muted">{item.date}</p>
    </article>
  );
}

const EMPTY_MESSAGES = {
  requests: "لا توجد طلبات لعرضها حالياً.",
  tasks: "لا توجد مهام معلقة حالياً.",
  evaluations: "لا توجد تقييمات مطلوبة حالياً.",
  achievements: "لم تُسجّل إنجازات بعد.",
  logs: "لا توجد سجلات إدارية لعرضها.",
};

export default function MobileTabPanels({ activeTab, data, isLoading }) {
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
    <div className="space-y-3">
      {activeTab === "requests" &&
        items.map((item) => <RequestRow key={item.id} item={item} />)}
      {activeTab === "tasks" &&
        items.map((item) => <TaskRow key={item.id} item={item} />)}
      {activeTab === "evaluations" &&
        items.map((item) => <EvaluationRow key={item.id} item={item} />)}
      {activeTab === "achievements" &&
        items.map((item) => <AchievementRow key={item.id} item={item} />)}
      {activeTab === "logs" &&
        items.map((item) => <LogRow key={item.id} item={item} />)}
    </div>
  );
}
