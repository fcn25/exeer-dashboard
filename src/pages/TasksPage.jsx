import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, Plus, User } from "lucide-react";
import ExeerEmptyState from "../components/brand/ExeerEmptyState.jsx";
import CreateTaskModal, {
  mapCreateTaskRow,
} from "../components/tasks/CreateTaskModal.jsx";
import TaskDetailDrawer from "../components/tasks/TaskDetailDrawer.jsx";
import {
  listTasks,
  updateTaskStatus,
} from "../services/tasksService.js";
import { normalizeTaskStatus } from "../utils/taskStatus.js";
import { formatLocaleDate } from "../i18n/formatLocale.js";
import { useAppLocale } from "../i18n/useAppLocale.js";
import { isDirectManager } from "../utils/rbac.js";
import { useAuth } from "../context/AuthContext.jsx";

export { normalizeTaskStatus };

const TASK_COLUMNS = [
  { id: "todo", status: "قيد الانتظار", label: "قيد الانتظار" },
  { id: "in-progress", status: "قيد التنفيذ", label: "قيد التنفيذ" },
  { id: "review", status: "للمراجعة", label: "للمراجعة" },
  { id: "done", status: "مكتملة", label: "مكتملة" },
];

function toDateInputValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDueDate(dateStr) {
  return formatLocaleDate(dateStr, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapTaskRow(row) {
  const mapped = mapCreateTaskRow(row);
  return {
    ...mapped,
    dueDate: toDateInputValue(mapped.dueDate),
  };
}

function TaskCard({ task, onStatusChange, isUpdating, onOpen }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(task);
        }
      }}
      className="md-surface flex cursor-pointer flex-col gap-3 p-4 transition-opacity hover:opacity-95"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-bold leading-snug text-exeer-primary">
          {task.title}
        </h3>
        {task.description && task.description !== task.title ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-exeer-muted">
            {task.description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-exeer-muted">
        <User className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-xs font-medium">{task.assignedTo}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-exeer-muted">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{formatDueDate(task.dueDate)}</span>
      </div>

      <div className="border-t border-exeer-border pt-3">
        <label className="mb-1.5 block text-xs font-medium text-exeer-muted">
          الحالة
        </label>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          onClick={(event) => event.stopPropagation()}
          disabled={isUpdating}
          className="md-input py-2 text-base md:text-sm"
          aria-label="تغيير حالة المهمة"
        >
          {TASK_COLUMNS.map((column) => (
            <option key={column.id} value={column.status}>
              {column.label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

export default function TasksPage() {
  const { t } = useAppLocale();
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const scopeToTeam = isDirectManager(role);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const rows = await listTasks();
      setTasks(rows.map(mapTaskRow));
    } catch (err) {
      setError(err.message || "تعذّر تحميل المهام.");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = async (taskId, nextStatus) => {
    const normalized = normalizeTaskStatus(nextStatus);
    const previous = tasks.find((item) => item.id === taskId);
    if (!previous || previous.status === normalized) return;

    setUpdatingTaskId(taskId);
    setTasks((prev) =>
      prev.map((item) =>
        item.id === taskId ? { ...item, status: normalized } : item,
      ),
    );

    try {
      await updateTaskStatus(taskId, normalized);
    } catch (err) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === taskId ? { ...item, status: previous.status } : item,
        ),
      );
      setError(err.message || "تعذّر تحديث حالة المهمة.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="md-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="md-page-title">{t("pages.tasks.title")}</h1>
          <p className="text-sm text-exeer-muted">
            {t("pages.tasks.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="md-btn-primary inline-flex items-center justify-center gap-2 self-start"
        >
          <Plus className="h-5 w-5" aria-hidden />
          إنشاء مهمة جديدة
        </button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="py-20 text-center text-sm text-exeer-muted">
          جاري التحميل...
        </p>
      ) : (
        <div className="grid min-h-[420px] flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TASK_COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status,
            );

            return (
              <section
                key={column.id}
                className="md-surface-muted flex min-h-[360px] flex-col p-4"
                aria-label={column.label}
              >
                <header className="mb-4 flex items-center justify-between gap-2 border-b border-exeer-border pb-3">
                  <h2 className="text-sm font-bold text-exeer-primary">
                    {column.label}
                  </h2>
                  <span className="rounded-md bg-white px-2.5 py-0.5 text-xs font-medium text-exeer-muted">
                    {columnTasks.length}
                  </span>
                </header>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pe-0.5">
                  {columnTasks.length === 0 ? (
                    <ExeerEmptyState
                      message="لا توجد مهام"
                      className="py-10"
                      symbolClassName="mb-2 h-10 w-10 object-contain opacity-[0.16]"
                    />
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingTaskId === task.id}
                        onOpen={setSelectedTask}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        scopeToTeam={scopeToTeam}
        onTaskCreated={(task) => {
          setTasks((prev) => [task, ...prev]);
          setError("");
        }}
      />

      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusChange}
        isUpdating={selectedTask ? updatingTaskId === selectedTask.id : false}
      />
    </div>
  );
}
