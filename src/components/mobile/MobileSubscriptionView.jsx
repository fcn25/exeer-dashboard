import { ArrowRight, X } from "lucide-react";
import SubscriptionPanel from "../subscription/SubscriptionPanel.jsx";
import { canShowBilling } from "../../lib/platform.ts";

export default function MobileSubscriptionView({ isOpen, onClose }) {
  if (!canShowBilling()) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      <header className="native-mobile-app-bar sticky top-0 z-10 border-b border-exeer-border bg-md-surface px-4 py-3">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-exeer-border text-exeer-muted"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-exeer-primary">
            الاشتراك والدفع
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-exeer-border text-exeer-muted"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] flex-1 overflow-y-auto px-4 py-5">
        <SubscriptionPanel variant="mobile" showPayNow />
      </div>
    </div>
  );
}
