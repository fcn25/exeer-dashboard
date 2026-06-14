import { Calendar, User, X } from "lucide-react";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { normalizeTaskStatus } from "../../utils/taskStatus.js";
import TaskActivityThread from "./TaskActivityThread.jsx";

function formatDueDate(dateStr) {
  return formatLocaleDate(dateStr, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TaskDetailDrawer({ task, isOpen, onClose, onStatusChange, isUpdating }) {
  if (!isOpen || !task) return null;

  const status = normalizeTaskStatus(task.status);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`تفاصيل المهمة: ${task.title}`}
        className="relative flex h-full w-full max-w-[480px] flex-col border-s border-[#E2E8F0] bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 dark:border-[var(--border-color)]">
          <div className="min-w-0 space-y-2">
            <h2 className="text-base font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
              {task.title}
            </h2>
            {task.description && task.description !== task.title ? (
              <p className="text-sm font-normal leading-relaxed text-[#64748B] dark:text-[var(--text-secondary)]">
                {task.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
                {task.assignedTo ?? "—"}
              </span>
              {task.dueDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
                  {formatDueDate(task.dueDate)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] p-2 text-[#64748B] hover:bg-[#F8FAFC] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </button>
        </header>

        {onStatusChange ? (
          <div className="border-b border-[#E2E8F0] px-4 py-3 dark:border-[var(--border-color)]">
            <label className="mb-1.5 block text-xs font-medium text-[#64748B] dark:text-[var(--text-secondary)]">
              الحالة
            </label>
            <select
              value={status}
              onChange={(event) => onStatusChange(task.id, event.target.value)}
              disabled={isUpdating}
              className="w-full rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-normal text-[#0F172A] outline-none dark:border-[var(--border-color)] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]"
            >
              <option value="قيد الانتظار">قيد الانتظار</option>
              <option value="قيد التنفيذ">قيد التنفيذ</option>
              <option value="للمراجعة">للمراجعة</option>
              <option value="مكتملة">مكتملة</option>
            </select>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TaskActivityThread taskId={task.id} />
        </div>
      </aside>
    </div>
  );
}
