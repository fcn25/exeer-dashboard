export function SettingField({ label, hint, children }) {
  return (
    <div className="space-y-2 border-b border-exeer-border pb-5 last:border-b-0 last:pb-0">
      <label className="md-label block">{label}</label>
      {hint ? (
        <p className="text-xs leading-relaxed text-exeer-muted">{hint}</p>
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
  fullWidth = false,
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
      className={`md-input disabled:opacity-60 ${fullWidth ? "w-full" : "w-full max-w-xs"}`}
    />
  );
}

export function SettingSelect({
  value,
  onChange,
  options,
  disabled = false,
  fullWidth = false,
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const raw = event.target.value;
        const match = options.find((opt) => String(opt.value) === raw);
        onChange(match?.value ?? raw);
      }}
      className={`md-input disabled:opacity-60 ${fullWidth ? "w-full" : "w-full max-w-xs"}`}
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
          checked ? "bg-md-primary dark:bg-slate-600" : "bg-gray-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "start-5" : "start-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-exeer-primary">
        {checked ? labelOn : labelOff}
      </span>
    </div>
  );
}

export function TabSaveButton({ onClick, isSaving, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className={`md-btn-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
    </button>
  );
}
