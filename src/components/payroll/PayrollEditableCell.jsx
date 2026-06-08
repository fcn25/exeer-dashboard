import { useEffect, useState } from "react";

export default function PayrollEditableCell({
  value,
  onSave,
  disabled = false,
  isSaving = false,
}) {
  const [draft, setDraft] = useState(String(value ?? 0));

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  const commit = async () => {
    const parsed = Number(draft);
    const nextValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (nextValue === Number(value ?? 0)) return;
    await onSave(nextValue);
  };

  return (
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
      className="w-full min-w-[88px] rounded-md border border-indigo-200 bg-white px-2 py-1.5 text-center text-sm tabular-nums text-slate-900 shadow-none focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-50"
      aria-label="تعديل القيمة"
    />
  );
}
