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
  const className =
    "flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-exeer-border bg-md-surface px-3 py-3 text-center transition-colors active:bg-exeer-hover dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:active:bg-[var(--bg-surface-hover)]";

  if (to) {
    return (
      <Link to={to} className={className}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
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
          className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
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
