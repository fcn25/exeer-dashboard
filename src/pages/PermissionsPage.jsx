import { useEffect, useState } from "react";
import { ROLE_LABELS, PERMISSION_DEFINITIONS, normalizePermissions } from "../constants/roles.js";
import {
  ensureDefaultRolePermissions,
  fetchRolePermissionsForCompany,
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

export default function PermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        await ensureDefaultRolePermissions();
        const rows = await fetchRolePermissionsForCompany();
        if (cancelled) return;
        setRoles(rows);
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
            ? { ...row, permissions: updated.permissions }
            : row,
        ),
      );
    } catch (err) {
      setError(err.message || "تعذّر حفظ الصلاحية.");
    } finally {
      setSavingKey("");
    }
  };

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

          <section className="md-surface space-y-4 p-6">
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
                  disabled={savingKey === definition.key}
                  onChange={(value) => handleToggle(definition.key, value)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
