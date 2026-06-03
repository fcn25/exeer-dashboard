import { X } from "lucide-react";

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
        className="absolute inset-0 bg-black/25"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col border-s border-gray-200 bg-white">
        <header className="shrink-0 border-b border-gray-200 px-6 pb-5 pt-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {subtitle ? (
                <p className="text-sm text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-slate-500 transition-colors hover:bg-gray-50"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {topAction ? <div className="mb-2">{topAction}</div> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
