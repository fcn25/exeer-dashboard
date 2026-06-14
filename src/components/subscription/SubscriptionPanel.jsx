import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Clock, Crown, Sparkles, Tag } from "lucide-react";
import { PAID_PLANS } from "../../constants/subscriptionPlans.js";
import { useTranslation } from "react-i18next";
import SuccessToast from "../ui/SuccessToast.jsx";
import {
  applyPromoCode,
  fetchCompanyBilling,
  PROMO_SUCCESS_MESSAGE,
} from "../../services/billingService.js";
import { handleTapPayment } from "../../services/tapPaymentService.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { getTrialCountdown } from "../../utils/trialCountdown.js";
import { canShowBilling } from "../../lib/platform.ts";

const PLAN_LABELS = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهٍ",
  cancelled: "ملغى",
};

export default function SubscriptionPanel({
  variant = "desktop",
  showPayNow = false,
  showCreateSubscriber = false,
  CreateSubscriberButton = null,
}) {
  const { t } = useTranslation();
  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payMessage, setPayMessage] = useState("");

  const isMobile = variant === "mobile";

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

  const trialEndsAt = billing?.trial_ends_at ?? null;
  const countdown = getTrialCountdown(trialEndsAt);
  const trialEndLabel = trialEndsAt
    ? formatLocaleDate(trialEndsAt, { dateStyle: "long" })
    : "يُحدَّد بعد تفعيل الاشتراك";

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

  const handleUpgrade = () => {
    setSuccessToast("سيتم تفعيل بوابة الدفع قريباً");
  };

  const handlePayNow = async () => {
    if (isPaying) return;
    setIsPaying(true);
    setPayMessage("");

    try {
      const result = await handleTapPayment();
      if (result.message) setPayMessage(result.message);
      if (result.ok) {
        setSuccessToast("تم استلام الدفع بنجاح.");
        await loadBilling();
      }
    } catch (err) {
      setPayMessage(err.message || "تعذّر بدء عملية الدفع.");
    } finally {
      setIsPaying(false);
    }
  };

  if (!canShowBilling()) return null;

  return (
    <div className={isMobile ? "space-y-5" : "space-y-8"}>
      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />

      {!isMobile ? (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-exeer-primary">
              {t("settings.subscription.title")}
            </h2>
            <p className="text-sm text-exeer-muted">
              {t("settings.subscription.description")}
            </p>
          </div>
          {canShowBilling() && showCreateSubscriber && CreateSubscriberButton ? (
            <CreateSubscriberButton />
          ) : null}
        </header>
      ) : (
        <header className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("settings.subscription.title")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("settings.subscription.description")}
          </p>
        </header>
      )}

      {canShowBilling() && showPayNow ? (
        <button
          type="button"
          onClick={handlePayNow}
          disabled={isPaying || isLoading}
          className="md-btn-primary w-full py-3.5 text-base font-bold"
        >
          {isPaying ? "جاري التحويل..." : "ادفع الآن"}
        </button>
      ) : null}

      {canShowBilling() && payMessage ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {payMessage}
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <article className="md-surface relative overflow-hidden p-5 md:p-8">
        <div className="relative space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-md-primary text-white dark:bg-slate-700">
              <Crown className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-exeer-muted">
                {t("settings.subscription.currentPlan")}
              </p>
              <p className="text-xl font-bold text-exeer-primary">
                Exeer —{" "}
                {PLAN_LABELS[billing?.plan_status] ?? billing?.plan_status ?? "تجريبي"}
              </p>
              <p className="text-sm text-exeer-muted">
                {t("settings.subscription.expiry")}: {trialEndLabel}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              countdown.expired
                ? "bg-amber-50 text-amber-900"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {countdown.expired ? "انتهت التجربة" : countdown.label}
          </span>

          <div className="rounded-md border border-exeer-border bg-exeer-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-md-primary" aria-hidden />
                الفترة التجريبية — 14 يوماً
              </span>
              <span className="text-md-primary">{isLoading ? "…" : countdown.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-exeer-border">
              <div
                className="h-full rounded-full bg-md-primary transition-all dark:bg-slate-700"
                style={{ width: `${countdown.percentRemaining}%` }}
              />
            </div>
          </div>
        </div>
      </article>

      {canShowBilling() ? (
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-exeer-primary">الباقات المتاحة</h3>
          <p className="text-xs text-exeer-muted">
            اختر الباقة المناسبة لفريقك — الدفع الإلكتروني قريباً
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PAID_PLANS.map((plan) => (
            <article
              key={plan.id}
              className="md-surface flex flex-col gap-4 p-5 transition-shadow hover:shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-lg font-bold text-exeer-primary">{plan.nameAr}</p>
                <p className="text-2xl font-extrabold text-md-primary">{plan.priceLabel}</p>
              </div>

              <ul className="space-y-2 text-sm text-exeer-muted">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleUpgrade}
                className="md-btn-primary mt-auto inline-flex w-full items-center justify-center gap-2"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden />
                ترقية الآن
              </button>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {canShowBilling() ? (
      <section className="md-surface space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 shrink-0 text-md-primary" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-exeer-primary">كود VIP حصري</h3>
            <p className="text-xs text-exeer-muted">
              أضف 60 يوماً (استخدام واحد لكل كود)
            </p>
          </div>
        </div>
        <form onSubmit={handleApplyPromo} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="EXEER-VIP-1"
            disabled={isApplying || isLoading}
            className="md-input flex-1 font-mono uppercase"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={isApplying || isLoading || !promoInput.trim()}
            className="md-btn-primary shrink-0 px-6"
          >
            {isApplying ? "..." : "تطبيق"}
          </button>
        </form>
        {promoError ? (
          <p className="text-sm text-red-700">{promoError}</p>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}
