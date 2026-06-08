import { useEffect, useMemo, useState } from "react";

function parseDraftValue(draft) {
  const parsed = Number(draft);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function PayrollEditableCell({
  value,
  onSave,
  onDirtyChange,
  disabled = false,
  isSaving = false,
  saveFailed = false,
}) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const parsedDraft = useMemo(() => parseDraftValue(draft), [draft]);
  const parsedValue = useMemo(() => parseDraftValue(String(value ?? 0)), [value]);
  const isDirty = parsedDraft !== parsedValue;

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  useEffect(() => {
    onDirtyChange?.(isDirty, parsedDraft);
  }, [isDirty, onDirtyChange, parsedDraft]);

  const commit = async () => {
    if (!isDirty) return true;
    return onSave(parsedDraft);
  };

  return (
    <div className="space-y-1">
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={draft}
        disabled={disabled || isSaving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={`w-full min-w-[88px] rounded-md border bg-white px-2 py-1.5 text-center text-sm tabular-nums text-slate-900 shadow-none focus:outline-none focus:ring-1 disabled:opacity-50 ${
          saveFailed
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300"
        }`}
        aria-label="تعديل القيمة"
        aria-invalid={saveFailed}
      />
      {saveFailed ? (
        <p className="text-[11px] font-medium text-red-700">لم يتم الحفظ</p>
      ) : null}
    </div>
  );
}
