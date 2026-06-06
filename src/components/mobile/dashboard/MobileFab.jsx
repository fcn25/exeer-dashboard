import { Plus, X } from "lucide-react";

export default function MobileFab({ isOpen, onToggle, actions, onAction }) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onToggle}
        />
      ) : null}

      <div className="native-safe-fixed-bottom fixed start-6 z-50 flex flex-col items-start gap-3">
        {isOpen ? (
          <div
            className="w-[min(280px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md"
            role="menu"
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-exeer-primary">إجراءات سريعة</p>
            </div>
            <ul className="p-2">
              {actions.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAction(action.id);
                      onToggle();
                    }}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-3 text-start transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-exeer-primary">
                      {action.label}
                    </span>
                    {action.description ? (
                      <span className="text-xs text-exeer-muted">
                        {action.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "إغلاق" : "إجراءات سريعة"}
          aria-expanded={isOpen}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-exeer-primary text-white shadow-md transition-transform hover:scale-[1.03] active:scale-[0.97]"
        >
          {isOpen ? (
            <X className="h-6 w-6 stroke-[1.75]" aria-hidden />
          ) : (
            <Plus className="h-6 w-6 stroke-[1.75]" aria-hidden />
          )}
        </button>
      </div>
    </>
  );
}
