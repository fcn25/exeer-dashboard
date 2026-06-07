export function SettingField({ label, hint, children }) {
  return (
    <div className="space-y-2 border-b border-[#e8e2d6] pb-5 last:border-b-0 last:pb-0">
      <label className="block text-sm font-semibold text-[#0D1B2A]">{label}</label>
      {hint ? (
        <p className="text-xs leading-relaxed text-[#64748b]">{hint}</p>
      ) : null}
      <div className="pt-1">{children}</div>
    </div>
  );
}

export function SettingNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className="md-input w-full max-w-xs border-[#d4cbb8] focus:border-[#b89a5e] focus:ring-[#b89a5e]/30 disabled:opacity-60"
    />
  );
}

export function SettingSelect({ value, onChange, options, disabled = false }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const raw = event.target.value;
        const match = options.find((opt) => String(opt.value) === raw);
        onChange(match?.value ?? raw);
      }}
      className="md-input w-full max-w-xs border-[#d4cbb8] focus:border-[#b89a5e] focus:ring-[#b89a5e]/30 disabled:opacity-60"
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function SettingToggle({ checked, onChange, labelOn, labelOff, disabled }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-[#b89a5e]" : "bg-[#cbd5e1]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "start-5" : "start-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-[#0D1B2A]">
        {checked ? labelOn : labelOff}
      </span>
    </div>
  );
}

export function TabSaveButton({ onClick, isSaving, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className="rounded-md bg-[#0D1B2A] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
    </button>
  );
}
