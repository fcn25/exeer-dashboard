import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  GraduationCap,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  canManageAdministrativeActions,
  isOwner,
} from "../../../utils/rbac.js";
import { ICON_CHIP, MOBILE_CARD, TYPE_SECTION } from "../../home/homeStyles.js";
import MobilePromotionRequestModal from "../MobilePromotionRequestModal.jsx";
import MobileSmartToolsGrid from "./MobileSmartToolsGrid.jsx";
import SuccessToast from "../../ui/SuccessToast.jsx";

const QUICK_LINKS = [
  {
    id: "administrative",
    labelKey: "pages.home.adminAction",
    icon: Briefcase,
    href: "/mobile/administrative-actions",
    visible: () => canManageAdministrativeActions(),
  },
  {
    id: "system",
    labelKey: "nav.systemCustomization",
    icon: SlidersHorizontal,
    href: "/mobile/settings/system",
    visible: () => isOwner(),
  },
  {
    id: "training",
    labelKey: "pages.home.trainingRequest",
    icon: GraduationCap,
    href: "/mobile/training",
    visible: () => true,
  },
  {
    id: "promotion",
    labelKey: "pages.home.promotionRequest",
    icon: TrendingUp,
    action: "promotion",
    visible: () => true,
  },
];

function QuickLinkCard({ icon: Icon, label, onClick, to }) {
  const className = `${MOBILE_CARD} flex min-h-[88px] w-full flex-col items-center justify-center gap-2 px-3 py-3 text-center transition-colors active:bg-[#F7F6F3] dark:active:bg-[var(--bg-surface-hover)]`;

  if (to) {
    return (
      <Link to={to} className={className}>
        <span className={ICON_CHIP}>
          <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
        </span>
        <span className="text-[11px] font-semibold leading-snug text-exeer-primary dark:text-[var(--text-primary)]">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <span className={ICON_CHIP}>
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-[11px] font-semibold leading-snug text-exeer-primary dark:text-[var(--text-primary)]">
        {label}
      </span>
    </button>
  );
}

export default function MobileManagerQuickTools() {
  const { t } = useTranslation();
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const links = QUICK_LINKS.filter((item) => item.visible());

  return (
    <>
      <section className="space-y-4" aria-labelledby="mobile-quick-tools-heading">
        <h2
          id="mobile-quick-tools-heading"
          className={TYPE_SECTION}
        >
          {t("pages.home.quickTools")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {links.map((item) => (
            <QuickLinkCard
              key={item.id}
              to={item.href}
              onClick={
                item.action === "promotion"
                  ? () => setIsPromotionOpen(true)
                  : undefined
              }
              icon={item.icon}
              label={t(item.labelKey)}
            />
          ))}
        </div>
      </section>

      <MobileSmartToolsGrid />

      <MobilePromotionRequestModal
        isOpen={isPromotionOpen}
        onClose={() => setIsPromotionOpen(false)}
        onSuccess={() =>
          setSuccessToast(t("pages.mobile.promotion.submitSuccess"))
        }
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </>
  );
}
