import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  ROLE_LABELS,
  PERMISSION_DEFINITIONS,
  normalizeAssignedEmployeeIds,
  normalizePermissions,
} from "../constants/roles.js";
import { listEmployees } from "../services/employeesService.js";
import {
  ensureDefaultRolePermissions,
  fetchRolePermissionsForCompany,
  updateRoleAssignedEmployees,
  updateRolePermissions,
} from "../services/permissionsService.js";

function ToggleSwitch({ checked, disabled, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-exeer-border bg-md-surface px-4 py-3">
      <span className="text-sm font-medium text-exeer-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-md-primary dark:bg-[#2563eb]" : "bg-exeer-border"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "start-0.5 translate-x-5" : "start-0.5 translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function EmployeeAssignMultiselect({
  employees,
  selectedIds,
  disabled,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedLabels = useMemo(() => {
    if (selectedIds.length === 0) return "لم يُعيَّن أحد";
    const names = employees
      .filter((emp) => selectedSet.has(Number(emp.id)))
      .map((emp) => emp.full_name);
    if (names.length <= 2) return names.join("، ");
    return `${names.slice(0, 2).join("، ")} +${names.length - 2}`;
  }, [employees, selectedIds, selectedSet]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (containerRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const toggleEmployee = (employeeId) => {
    const id = Number(employeeId);
    const next = selectedSet.has(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];
    onChange(normalizeAssignedEmployeeIds(next));
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <span className="md-label block">الموظفون المعيَّنون لهذا الدور</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="md-input flex w-full items-center justify-between gap-2 text-start disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate text-sm">{selectedLabels}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-exeer-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-exeer-border bg-md-surface shadow-lg"
        >
          {employees.length === 0 ? (
            <p className="px-4 py-3 text-sm text-exeer-muted">لا يوجد موظفون</p>
          ) : (
            employees.map((employee) => {
              const id = Number(employee.id);
              const checked = selectedSet.has(id);
              return (
                <label
                  key={employee.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-exeer-border px-4 py-2.5 text-sm last:border-b-0 hover:bg-exeer-hover"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleEmployee(id)}
                    className="h-4 w-4 rounded border-exeer-border"
                  />
                  <span className="font-medium text-exeer-primary">
                    {employee.full_name}
                  </span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeRole, setActiveRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [isSavingEmployees, setIsSavingEmployees] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        await ensureDefaultRolePermissions();
        const [rows, employeeRows] = await Promise.all([
          fetchRolePermissionsForCompany(),
          listEmployees(),
        ]);
        if (cancelled) return;
        setRoles(rows);
        setEmployees(employeeRows);
        setActiveRole((current) => current || rows[0]?.role_name || "");
      } catch (err) {
        if (!cancelled) setError(err.message || "تعذّر تحميل الصلاحيات.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRecord = roles.find((row) => row.role_name === activeRole);
  const activePermissions = normalizePermissions(activeRecord?.permissions);
  const activeAssignedIds = normalizeAssignedEmployeeIds(
    activeRecord?.assigned_employees,
  );

  const handleToggle = async (permissionKey, nextValue) => {
    if (!activeRole) return;

    setSavingKey(permissionKey);
    setError("");

    const nextPermissions = {
      ...activePermissions,
      [permissionKey]: nextValue,
    };

    try {
      const updated = await updateRolePermissions(activeRole, nextPermissions);
      setRoles((prev) =>
        prev.map((row) =>
          row.role_name === updated.role_name
            ? {
                ...row,
                permissions: updated.permissions,
                assigned_employees: updated.assigned_employees,
              }
            : row,
        ),
      );
    } catch (err) {
      setError(err.message || "تعذّر حفظ الصلاحية.");
    } finally {
      setSavingKey("");
    }
  };

  const handleAssignedEmployeesChange = async (nextIds) => {
    if (!activeRole) return;

    setIsSavingEmployees(true);
    setError("");

    try {
      const updated = await updateRoleAssignedEmployees(activeRole, nextIds);
      setRoles((prev) =>
        prev.map((row) =>
          row.role_name === updated.role_name
            ? {
                ...row,
                permissions: updated.permissions,
                assigned_employees: updated.assigned_employees,
              }
            : row,
        ),
      );
    } catch (err) {
      setError(err.message || "تعذّر حفظ تعيين الموظفين.");
    } finally {
      setIsSavingEmployees(false);
    }
  };

  const permissionsBusy = Boolean(savingKey);
  const employeesBusy = isSavingEmployees;

  return (
    <div className="md-page">
      <header className="space-y-2">
        <h1 className="md-page-title">الصلاحيات</h1>
        <p className="text-sm text-exeer-muted">
          إدارة صلاحيات الأدوار لمنشأتك — مدير النظام لديه صلاحيات كاملة دائماً
        </p>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-exeer-muted">
          جاري التحميل...
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <nav className="md-surface flex flex-row gap-2 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {roles.map((row) => (
              <button
                key={row.role_name}
                type="button"
                onClick={() => setActiveRole(row.role_name)}
                className={`rounded-2xl px-4 py-3 text-start text-sm font-medium transition-colors ${
                  activeRole === row.role_name
                    ? "bg-md-primary-container text-exeer-primary dark:bg-[#1e3a5f] dark:text-[#e2e8f0]"
                    : "text-exeer-muted hover:bg-exeer-hover"
                }`}
              >
                {ROLE_LABELS[row.role_name] ?? row.role_name}
              </button>
            ))}
          </nav>

          <section className="md-surface space-y-6 p-6">
            <header className="space-y-1 border-b border-exeer-border pb-4">
              <h2 className="text-lg font-bold text-exeer-primary">
                {ROLE_LABELS[activeRole] ?? activeRole}
              </h2>
              <p className="text-sm text-exeer-muted">
                فعّل أو عطّل الصلاحيات لهذا الدور
              </p>
            </header>

            <div className="space-y-3">
              {PERMISSION_DEFINITIONS.map((definition) => (
                <ToggleSwitch
                  key={definition.key}
                  label={definition.label}
                  checked={Boolean(activePermissions[definition.key])}
                  disabled={permissionsBusy}
                  onChange={(value) => handleToggle(definition.key, value)}
                />
              ))}
            </div>

            <div className="border-t border-exeer-border pt-6">
              <EmployeeAssignMultiselect
                employees={employees}
                selectedIds={activeAssignedIds}
                disabled={employeesBusy || permissionsBusy || !activeRole}
                onChange={handleAssignedEmployeesChange}
              />
              {employeesBusy ? (
                <p className="mt-2 text-xs text-exeer-muted">جاري الحفظ...</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
