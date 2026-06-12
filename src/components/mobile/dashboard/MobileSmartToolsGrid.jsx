import { getMobileVisibleSmartTools } from "../../../constants/smartTools.js";
import { useSmartToolsModals } from "../../../hooks/useSmartToolsModals.js";
import { ICON_CHIP, MOBILE_CARD, TYPE_SECTION } from "../../home/homeStyles.js";
import SmartToolsModals from "../../smart-tools/SmartToolsModals.jsx";

function MobileSmartToolCard({ label, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${MOBILE_CARD} flex min-h-[108px] flex-col items-center justify-center gap-2.5 px-3 py-4 text-center transition-colors active:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-50 dark:active:bg-[var(--bg-surface-hover)]`}
    >
      <span className={ICON_CHIP}>
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-xs font-semibold leading-snug text-exeer-primary dark:text-[var(--text-primary)]">
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
          className={TYPE_SECTION}
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
