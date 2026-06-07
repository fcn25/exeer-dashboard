import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SubscriptionPanel from "../components/subscription/SubscriptionPanel.jsx";
import LocaleShell from "../components/ui/LocaleShell.jsx";

export default function MobileSubscriptionPage() {
  const navigate = useNavigate();

  return (
    <LocaleShell className="min-h-screen bg-md-surface-dim pb-8">
      <header className="sticky top-0 z-10 border-b border-exeer-border bg-md-surface px-4 py-3">
        <div className="mx-auto flex max-w-[480px] items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/mobile")}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-exeer-border text-exeer-muted"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-base font-bold text-exeer-primary">
            الاشتراك والدفع
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4 py-5">
        <SubscriptionPanel variant="mobile" showPayNow />
      </div>
    </LocaleShell>
  );
}
