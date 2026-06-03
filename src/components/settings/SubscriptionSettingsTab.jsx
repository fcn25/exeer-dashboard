import { useCallback, useEffect, useState } from "react";
import { Clock, Crown, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import SuccessToast from "../ui/SuccessToast.jsx";
import {
  applyPromoCode,
  fetchCompanyBilling,
  PROMO_SUCCESS_MESSAGE,
} from "../../services/billingService.js";
import { getTrialCountdown } from "../../utils/trialCountdown.js";
import { CreateSubscriberButton } from "./CreateSubscriberModal.jsx";

const PLAN_LABELS = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهٍ",
  cancelled: "ملغى",
};

export default function SubscriptionSettingsTab() {
  const { t } = useTranslation();
  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const loadBilling = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchCompanyBilling();
      setBilling(data);
    } catch (err) {
      setLoadError(err.message || "تعذّر تحميل بيانات الاشتراك.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const countdown = getTrialCountdown(billing?.trial_ends_at);
  const trialEndLabel = billing?.trial_ends_at
    ? new Date(billing.trial_ends_at).toLocaleDateString("ar-SA", {
        dateStyle: "long",
      })
    : "—";

  const handleApplyPromo = async (event) => {
    event.preventDefault();
    if (isApplying) return;

    setIsApplying(true);
    setPromoError("");

    try {
      const result = await applyPromoCode(promoInput);
      setBilling(result.billing);
      setPromoInput("");
      setSuccessToast(result.message ?? PROMO_SUCCESS_MESSAGE);
    } catch (err) {
      setPromoError(err.message || "تعذّر تفعيل الكود.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-8">
      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("settings.subscription.title")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("settings.subscription.description")}
          </p>
        </div>
        <CreateSubscriberButton />
      </header>

      {loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <article className="md-surface relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -end-8 -top-8 h-32 w-32 rounded-full bg-md-primary-container opacity-60 dark:bg-[#1e3a5f]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-md-primary text-white dark:bg-[#2563eb]">
                <Crown className="h-7 w-7 stroke-[1.75]" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-exeer-muted">
                  {t("settings.subscription.currentPlan")}
                </p>
                <p className="text-2xl font-bold text-exeer-primary">
                  Exeer —{" "}
                  {PLAN_LABELS[billing?.plan_status] ?? billing?.plan_status ?? "تجريبي"}
                </p>
                <p className="text-sm text-exeer-muted">
                  {t("settings.subscription.expiry")}: {trialEndLabel}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                countdown.expired
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {countdown.expired
                ? "انتهت التجربة"
                : t("settings.subscription.active")}
            </span>
          </div>

          <div className="rounded-2xl border border-exeer-border bg-exeer-surface p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-exeer-primary">
                <Clock className="h-5 w-5 text-md-primary" aria-hidden />
                الفترة التجريبية — 14 يوماً
              </div>
              <span className="text-sm font-bold text-md-primary">
                {isLoading ? "…" : countdown.label}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-exeer-border"
              role="progressbar"
              aria-valuenow={countdown.percentRemaining}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-md-primary transition-all duration-500 dark:bg-[#2563eb]"
                style={{ width: `${countdown.percentRemaining}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-exeer-muted">
              {countdown.expired
                ? "جدّد اشتراكك أو فعّل كود VIP لإضافة أيام إضافية."
                : "يتبقى من فترتك التجريبية المجانية قبل التحويل للخطة المدفوعة."}
            </p>
          </div>
        </div>
      </article>

      <section className="md-surface space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-md-primary-container text-exeer-primary dark:bg-[#1e3a5f]">
            <Tag className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-exeer-primary">كود VIP حصري</h3>
            <p className="text-sm text-exeer-muted">
              أدخل كود المبكرين لإضافة 60 يوماً إضافية لاشتراكك (استخدام واحد لكل كود).
            </p>
          </div>
        </div>

        <form
          onSubmit={handleApplyPromo}
          className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="EXEER-VIP-1"
            disabled={isApplying || isLoading}
            className="md-input flex-1 font-mono uppercase tracking-wide"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={isApplying || isLoading || !promoInput.trim()}
            className="md-btn-primary shrink-0 px-8 sm:min-w-[120px]"
          >
            {isApplying ? "جاري التطبيق..." : "تطبيق"}
          </button>
        </form>

        {promoError ? (
          <p className="text-sm text-red-700 dark:text-red-300">{promoError}</p>
        ) : null}
      </section>
    </div>
  );
}
