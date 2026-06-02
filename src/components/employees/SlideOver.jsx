import { Upload, X } from "lucide-react";

export default function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  topAction,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-md-surface md-elevated">
        <header className="shrink-0 border-b border-exeer-border px-6 pb-5 pt-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-exeer-primary">{title}</h2>
              {subtitle ? (
                <p className="text-sm text-exeer-muted">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover hover:text-exeer-primary"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {topAction ? (
            <div className="mb-2">{topAction}</div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-exeer-border bg-md-surface px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export function BulkImportPlaceholder() {
  return (
    <button
      type="button"
      disabled
      className="md-btn-tonal flex w-full items-center justify-center gap-2 opacity-70"
      title="قريباً"
    >
      <Upload className="h-4 w-4" aria-hidden />
      استيراد جماعي (CSV)
      <span className="rounded-lg bg-exeer-surface px-2 py-0.5 text-[10px] font-medium text-exeer-muted">
        قريباً
      </span>
    </button>
  );
}
