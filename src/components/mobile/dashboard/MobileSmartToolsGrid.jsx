import { getMobileVisibleSmartTools } from "../../../constants/smartTools.js";
import { useSmartToolsModals } from "../../../hooks/useSmartToolsModals.js";
import SmartToolsModals from "../../smart-tools/SmartToolsModals.jsx";

function MobileSmartToolCard({ label, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-3 py-4 text-center shadow-sm transition-colors active:scale-[0.98] active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-slate-50 text-exeer-primary">
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-xs font-semibold leading-snug text-exeer-primary">
        {label}
      </span>
    </button>
  );
}

export default function MobileSmartToolsGrid() {
  const { resolveToolAction, modalProps } = useSmartToolsModals();
  const visibleTools = getMobileVisibleSmartTools();

  if (!visibleTools.length) return null;

  return (
    <>
      <section className="space-y-3" aria-labelledby="mobile-achievements-record-heading">
        <h2
          id="mobile-achievements-record-heading"
          className="text-sm font-bold text-exeer-primary"
        >
          سجل الإنجازات
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {visibleTools.map((tool) => {
            const onClick = resolveToolAction(tool.id);

            return (
              <MobileSmartToolCard
                key={tool.id}
                label={tool.label}
                icon={tool.icon}
                onClick={onClick}
                disabled={!onClick}
              />
            );
          })}
        </div>
      </section>
      <SmartToolsModals {...modalProps} />
    </>
  );
}
