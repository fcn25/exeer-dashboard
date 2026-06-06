import { useState } from "react";

const UNASSIGNED_LABEL = "غير محدد";

export function resolveWorkLocationLabel(employee) {
  return employee?.company_branches?.name ?? UNASSIGNED_LABEL;
}

export default function WorkLocationSelect({
  employeeId,
  value,
  branches,
  disabled = false,
  onUpdated,
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event) => {
    const nextValue = event.target.value || null;
    setIsSaving(true);
    try {
      await onUpdated(employeeId, nextValue);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <select
      value={value ?? ""}
      onChange={handleChange}
      disabled={disabled || isSaving || !branches.length}
      className="md-input min-w-[140px] py-1.5 text-xs"
      aria-label="موقع العمل"
    >
      <option value="">{UNASSIGNED_LABEL}</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
