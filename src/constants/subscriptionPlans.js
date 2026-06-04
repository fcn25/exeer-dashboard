/** SaaS plan catalog — no imports (safe leaf module). */

export const SUBSCRIPTION_TIER = {
  TRIAL: "trial",
  STARTUP: "startup",
  GROWTH: "growth",
};

export const TRIAL_PLAN = {
  id: SUBSCRIPTION_TIER.TRIAL,
  nameAr: "تجريبي",
  priceSar: 0,
  maxEmployees: 50,
  aiQueriesPerMonth: 100,
  aiUnlimited: false,
};

export const PAID_PLANS = [
  {
    id: SUBSCRIPTION_TIER.STARTUP,
    nameAr: "باقة الانطلاق",
    priceSar: 249,
    priceLabel: "249 ر.س / شهر",
    maxEmployees: 50,
    aiQueriesPerMonth: 100,
    aiUnlimited: false,
    features: [
      "حتى 50 موظف",
      "100 استعلام ذكاء اصطناعي شهرياً",
    ],
  },
  {
    id: SUBSCRIPTION_TIER.GROWTH,
    nameAr: "باقة النمو",
    priceSar: 449,
    priceLabel: "449 ر.س / شهر",
    maxEmployees: 100,
    aiQueriesPerMonth: null,
    aiUnlimited: true,
    features: [
      "حتى 100 موظف",
      "استعلامات ذكاء اصطناعي غير محدودة",
    ],
  },
];

const TIER_LIMITS = {
  [SUBSCRIPTION_TIER.TRIAL]: {
    maxEmployees: 50,
    aiUnlimited: false,
    aiQueriesPerMonth: 100,
  },
  [SUBSCRIPTION_TIER.STARTUP]: {
    maxEmployees: 50,
    aiUnlimited: false,
    aiQueriesPerMonth: 100,
  },
  [SUBSCRIPTION_TIER.GROWTH]: {
    maxEmployees: 100,
    aiUnlimited: true,
    aiQueriesPerMonth: null,
  },
};

export function normalizeSubscriptionTier(raw) {
  const tier = String(raw ?? "").trim().toLowerCase();
  if (tier === SUBSCRIPTION_TIER.STARTUP || tier === SUBSCRIPTION_TIER.GROWTH) {
    return tier;
  }
  return SUBSCRIPTION_TIER.TRIAL;
}

export function getPlanLimitsForTier(tier) {
  return TIER_LIMITS[normalizeSubscriptionTier(tier)] ?? TIER_LIMITS[SUBSCRIPTION_TIER.TRIAL];
}

export function getPlanDisplayNameAr(tier) {
  if (tier === SUBSCRIPTION_TIER.STARTUP) return PAID_PLANS[0].nameAr;
  if (tier === SUBSCRIPTION_TIER.GROWTH) return PAID_PLANS[1].nameAr;
  return TRIAL_PLAN.nameAr;
}
