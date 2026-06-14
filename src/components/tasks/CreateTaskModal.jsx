import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DateInput } from "../ui/DateInput.jsx";
import { listEmployeesForTasks } from "../../services/employeesService.js";
import { listMyTeamEmployees } from "../../services/myTeamService.js";
import { createTask } from "../../services/tasksService.js";
import { normalizeTaskStatus } from "../../utils/taskStatus.js";

const DEFAULT_STATUS = "قيد الانتظار";

export function mapCreateTaskRow(row) {
  const description = String(row.description ?? "").trim();
  const title =
    String(row.title ?? "").trim() || description.slice(0, 60) || "مهمة";

  return {
    id: String(row.id),
    title,
    description,
    assignedTo: String(row.assigned_to_name ?? "—"),
    assignedToId: row.assigned_to_id,
    dueDate: row.deadline ?? row.due_date,
    status: normalizeTaskStatus(row.status),
  };
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  scopeToTeam = false,
}) {
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
        const rows = scopeToTeam
          ? await listMyTeamEmployees()
          : await listEmployeesForTasks();
        const normalized = scopeToTeam
          ? rows
              .map((item) => ({
                id: Number(item.id),
                name: String(item.full_name ?? "").trim(),
              }))
              .filter((item) => !Number.isNaN(item.id) && item.name)
          : rows;

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
  }, [isOpen, scopeToTeam]);

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
        status: DEFAULT_STATUS,
      });

      onTaskCreated?.(mapCreateTaskRow(created));
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
