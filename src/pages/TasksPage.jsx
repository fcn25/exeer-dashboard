import { useCallback, useEffect, useState } from "react";
import { Calendar, Plus, User, X } from "lucide-react";
import { DateInput } from "../components/ui/DateInput.jsx";
import { listEmployeesForTasks } from "../services/employeesService.js";
import {
  createTask,
  listTasks,
  updateTaskStatus,
} from "../services/tasksService.js";

const TASK_COLUMNS = [
  { id: "todo", status: "قيد الانتظار", label: "قيد الانتظار" },
  { id: "in-progress", status: "قيد التنفيذ", label: "قيد التنفيذ" },
  { id: "review", status: "للمراجعة", label: "للمراجعة" },
  { id: "done", status: "مكتملة", label: "مكتملة" },
];

const COLUMN_STATUS_ORDER = TASK_COLUMNS.map((column) => column.status);

const STATUS_ALIASES = {
  "to do": "قيد الانتظار",
  todo: "قيد الانتظار",
  pending: "قيد الانتظار",
  "in progress": "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
  progress: "قيد التنفيذ",
  review: "للمراجعة",
  done: "مكتملة",
  completed: "مكتملة",
  complete: "مكتملة",
};

export function normalizeTaskStatus(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return TASK_COLUMNS[0].status;
  if (COLUMN_STATUS_ORDER.includes(raw)) return raw;

  const key = raw.toLowerCase().replace(/\s+/g, " ");
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  const underscored = key.replace(/ /g, "_");
  if (STATUS_ALIASES[underscored]) return STATUS_ALIASES[underscored];

  return TASK_COLUMNS[0].status;
}

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
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function mapTaskRow(row) {
  const description = String(row.description ?? "").trim();
  const title = String(row.title ?? "").trim() || description.slice(0, 60) || "مهمة";

  return {
    id: String(row.id),
    title,
    description,
    assignedTo: String(row.assigned_to_name ?? "—"),
    assignedToId: row.assigned_to_id,
    dueDate: toDateInputValue(row.deadline ?? row.due_date),
    status: normalizeTaskStatus(row.status),
  };
}

function TaskCard({ task, onStatusChange, isUpdating }) {
  return (
    <article className="md-surface flex flex-col gap-3 p-4 transition-opacity">
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
          disabled={isUpdating}
          className="md-input py-2 text-xs"
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

function CreateTaskModal({ isOpen, onClose, onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [employees, setEmployees] = useState([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setTitle("");
    setDescription("");
    setDueDate("");
    setSubmitError("");

    async function fetchEmployees() {
      setIsEmployeesLoading(true);
      setEmployeesError("");

      try {
        const normalized = await listEmployeesForTasks();
        if (cancelled) return;
        setEmployees(normalized);
        setAssignedEmployeeId(
          normalized.length > 0 ? String(normalized[0].id) : "",
        );
      } catch (err) {
        if (!cancelled) {
          setEmployeesError(err.message || "تعذّر تحميل الموظفين.");
          setEmployees([]);
          setAssignedEmployeeId("");
        }
      } finally {
        if (!cancelled) setIsEmployeesLoading(false);
      }
    }

    fetchEmployees();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === assignedEmployeeId,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const employeeId = Number(assignedEmployeeId);

    if (
      !trimmedTitle ||
      !assignedEmployeeId ||
      Number.isNaN(employeeId) ||
      !dueDate ||
      isSubmitting
    ) {
      setSubmitError("يرجى تعبئة العنوان، الموظف، وتاريخ الاستحقاق.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const created = await createTask({
        title: trimmedTitle,
        description: trimmedDescription || trimmedTitle,
        assigned_to_id: employeeId,
        assigned_to_name: selectedEmployee?.name ?? "",
        due_date: dueDate,
        status: TASK_COLUMNS[0].status,
      });

      onTaskCreated(mapTaskRow(created));
      onClose();
    } catch (err) {
      setSubmitError(err.message || "تعذّر إنشاء المهمة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formDisabled = isSubmitting || isEmployeesLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="md-surface relative w-full max-w-lg p-6 md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 start-4 flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2
          id="create-task-title"
          className="mb-6 px-10 text-center text-xl font-bold text-exeer-primary"
        >
          إنشاء مهمة جديدة
        </h2>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="task-title" className="md-label mb-2 block">
              عنوان المهمة <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={formDisabled}
              className="md-input"
              placeholder="مثال: مراجعة عقود الربع الثاني"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="md-label mb-2 block">
              الوصف
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={formDisabled}
              className="md-input resize-none"
              placeholder="تفاصيل إضافية..."
            />
          </div>

          <div>
            <label htmlFor="task-assignee" className="md-label mb-2 block">
              المسند إليه <span className="text-red-500">*</span>
            </label>
            <select
              id="task-assignee"
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              disabled={formDisabled}
              className="md-input"
            >
              {employees.length === 0 ? (
                <option value="">لا يوجد موظفون</option>
              ) : (
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {employeesError ? (
            <p className="text-center text-sm text-red-700">{employeesError}</p>
          ) : null}

          <DateInput
            id="task-due-date"
            label="تاريخ الاستحقاق"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={formDisabled}
            required
          />

          {submitError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              formDisabled ||
              !title.trim() ||
              !assignedEmployeeId ||
              !dueDate
            }
            className="md-btn-primary w-full"
          >
            {isSubmitting ? "جاري الحفظ..." : "إنشاء المهمة"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

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
    const previous = tasks.find((t) => t.id === taskId);
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
          <h1 className="md-page-title">إدارة المهام</h1>
          <p className="text-sm text-exeer-muted">
            لوحة كانبان — غيّر الحالة من القائمة لتحديث المهمة فوراً
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
                    <p className="py-12 text-center text-xs text-exeer-muted">
                      لا توجد مهام
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingTaskId === task.id}
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
        onTaskCreated={(task) => {
          setTasks((prev) => [task, ...prev]);
          setError("");
        }}
      />
    </div>
  );
}
