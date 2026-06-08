import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";

export default function PasswordInput({
  id,
  value,
  onChange,
  disabled = false,
  autoComplete,
  minLength,
  className = "md-input",
}) {
  const { t } = useAppLocale();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minLength={minLength}
        className={`${className} pe-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((show) => !show)}
        className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50 dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)]"
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
