/**
 * Estimated Nitaqat (Saudization) calculations from current employee snapshot.
 *
 * NOTE: Official Nitaqat uses a 26-week GOSI wage average. This module uses
 * current basic_salary + housing_allowance as an approximate snapshot only.
 *
 * TODO v2: special categories — disabled ×4, students 0.5 capped, prisoners ×2.
 */

export const NITAQAT_BANDS = {
  red: "red",
  yellow: "yellow",
  green: "green",
  platinum: "platinum",
};

export const ENTITY_SIZE_LABELS = {
  small_a: "صغيرة (أ) — 1–5",
  small_b: "صغيرة (ب) — 6–49",
  medium_a: "متوسطة (أ) — 50–99",
  medium_b: "متوسطة (ب) — 100–199",
  medium_c: "متوسطة (ج) — 200–499",
  large: "كبيرة — 500–2999",
  giant: "عملاقة — 3000+",
};

const GCC_NATIONALITY_TOKENS = [
  "إمارات",
  "امارات",
  "emirati",
  "uae",
  "كويت",
  "kuwait",
  "kuwaiti",
  "قط",
  "qatar",
  "qatari",
  "بحرين",
  "bahrain",
  "bahraini",
  "عمان",
  "oman",
  "omani",
];

const SAUDI_NATIONALITY_TOKENS = ["سعود", "saudi", "sa", "ksa"];

export function normalizeNationality(nationality) {
  return String(nationality ?? "").trim().toLowerCase();
}

export function isSaudiNationality(nationality) {
  const normalized = normalizeNationality(nationality);
  return SAUDI_NATIONALITY_TOKENS.some((token) => normalized.includes(token));
}

export function isGccNationality(nationality) {
  const normalized = normalizeNationality(nationality);
  return GCC_NATIONALITY_TOKENS.some((token) => normalized.includes(token));
}

export function monthlyNitaqatSalary(employee) {
  const basic = Number(employee?.basic_salary ?? 0);
  const housing = Number(employee?.housing_allowance ?? 0);
  return (Number.isFinite(basic) ? basic : 0) + (Number.isFinite(housing) ? housing : 0);
}

/**
 * Salary weight per Nitaqat guide (basic + housing).
 * - Below 1500 SAR: 0
 * - 1500–2999: 0.5 + ((salary − 1500) ÷ 3000)
 * - 3000+: 1
 */
export function saudiSalaryWeight(salary) {
  const amount = Number(salary);
  if (!Number.isFinite(amount) || amount < 1500) return 0;
  if (amount < 3000) return 0.5 + (amount - 1500) / 3000;
  return 1;
}

export function isSaudiForNitaqat(employee) {
  if (employee?.is_saudi === true) return true;
  if (employee?.is_saudi === false) {
    return isGccNationality(employee?.nationality);
  }
  return (
    isSaudiNationality(employee?.nationality) ||
    isGccNationality(employee?.nationality)
  );
}

export function isOwnerRole(role) {
  return String(role ?? "").trim().toLowerCase() === "owner";
}

export function getEntitySizeKey(employeeCount) {
  const count = Number(employeeCount) || 0;
  if (count <= 5) return "small_a";
  if (count <= 49) return "small_b";
  if (count <= 99) return "medium_a";
  if (count <= 199) return "medium_b";
  if (count <= 499) return "medium_c";
  if (count <= 2999) return "large";
  return "giant";
}

export function getEntitySizeLabel(employeeCount) {
  return ENTITY_SIZE_LABELS[getEntitySizeKey(employeeCount)] ?? "—";
}

function roundRate(value) {
  return Math.round(value * 10) / 10;
}

function resolveBand({ rate, requiredGreen, requiredPlatinum }) {
  if (requiredGreen == null || !Number.isFinite(Number(requiredGreen))) {
    return null;
  }

  const green = Number(requiredGreen);
  const platinum =
    requiredPlatinum != null && Number.isFinite(Number(requiredPlatinum))
      ? Number(requiredPlatinum)
      : null;

  if (platinum != null && rate >= platinum) return NITAQAT_BANDS.platinum;
  if (rate >= green) return NITAQAT_BANDS.green;

  const yellowFloor = green * 0.85;
  if (rate >= yellowFloor) return NITAQAT_BANDS.yellow;
  return NITAQAT_BANDS.red;
}

function computeEstimatedRate(workforce, ownerEmployeeId) {
  let saudiWeightTotal = 0;
  let expatCount = 0;
  let ownerCounted = false;

  for (const employee of workforce) {
    if (isSaudiForNitaqat(employee)) {
      saudiWeightTotal += saudiSalaryWeight(monthlyNitaqatSalary(employee));
      if (ownerEmployeeId != null && Number(employee.id) === Number(ownerEmployeeId)) {
        ownerCounted = true;
      }
    } else {
      expatCount += 1;
    }
  }

  if (ownerEmployeeId != null && !ownerCounted) {
    saudiWeightTotal += 1;
  }

  const denominator = saudiWeightTotal + expatCount;
  if (denominator <= 0) return { rate: 0, saudiWeightTotal, expatCount };

  return {
    rate: roundRate((saudiWeightTotal / denominator) * 100),
    saudiWeightTotal,
    expatCount,
  };
}

function simulateHireOneSaudi({ saudiWeightTotal, expatCount }) {
  const nextSaudi = saudiWeightTotal + 1;
  const denominator = nextSaudi + expatCount;
  if (denominator <= 0) return 0;
  return roundRate((nextSaudi / denominator) * 100);
}

/**
 * @param {object} params
 * @param {Array} params.workforce active employees
 * @param {number|null} params.ownerEmployeeId
 * @param {number|null} params.requiredGreen
 * @param {number|null} params.requiredPlatinum
 * @param {string|null} params.sectorName
 */
export function computeNitaqatSnapshot({
  workforce = [],
  ownerEmployeeId = null,
  requiredGreen = null,
  requiredPlatinum = null,
  sectorName = null,
}) {
  const employeeCount = workforce.length;
  const entitySizeKey = getEntitySizeKey(employeeCount);
  const entitySizeLabel = getEntitySizeLabel(employeeCount);
  const ownerRegistered = ownerEmployeeId != null;

  if (employeeCount <= 5) {
    const hasSaudi = workforce.some(isSaudiForNitaqat);
    const band =
      hasSaudi && ownerRegistered ? NITAQAT_BANDS.green : NITAQAT_BANDS.red;

    return {
      isSmallEntity: true,
      employeeCount,
      entitySizeKey,
      entitySizeLabel,
      sectorName,
      ownerRegistered,
      hasSaudiEmployee: hasSaudi,
      estimatedRate: null,
      band,
      bandLabel: band === NITAQAT_BANDS.green ? "أخضر (مبسّط)" : "أحمر (مبسّط)",
      requiredGreen: null,
      requiredPlatinum: null,
      needsThresholds: false,
      needsSector: !sectorName,
      simulationRate: null,
      simulationMessage: null,
      disclaimer:
        "مؤشر تقديري من بياناتك — النطاق الرسمي من قِوى/التأمينات. الكيانات الصغيرة (5 عمال أو أقل) تُقيَّم بوجود سعودي + تسجيل المالك.",
    };
  }

  const { rate, saudiWeightTotal, expatCount } = computeEstimatedRate(
    workforce,
    ownerEmployeeId,
  );
  const needsThresholds =
    requiredGreen == null || !Number.isFinite(Number(requiredGreen));
  const band = needsThresholds
    ? null
    : resolveBand({ rate, requiredGreen, requiredPlatinum });
  const simulationRate = simulateHireOneSaudi({ saudiWeightTotal, expatCount });

  let simulationMessage = null;
  if (!needsThresholds && simulationRate > rate) {
    simulationMessage = `توظيف سعودي واحد (وزن 1) يرفعك إلى ${simulationRate}%`;
  }

  const bandLabels = {
    red: "أحمر",
    yellow: "أصفر",
    green: "أخضر",
    platinum: "بلاتيني",
  };

  return {
    isSmallEntity: false,
    employeeCount,
    entitySizeKey,
    entitySizeLabel,
    sectorName,
    ownerRegistered,
    hasSaudiEmployee: saudiWeightTotal > 0,
    estimatedRate: rate,
    band,
    bandLabel: band ? bandLabels[band] : null,
    requiredGreen: needsThresholds ? null : Number(requiredGreen),
    requiredPlatinum:
      requiredPlatinum != null && Number.isFinite(Number(requiredPlatinum))
        ? Number(requiredPlatinum)
        : null,
    needsThresholds,
    needsSector: !sectorName,
    simulationRate,
    simulationMessage,
    disclaimer:
      "مؤشر تقديري من بياناتك — النطاق الرسمي من قِوى/التأمينات.",
  };
}

export function getNitaqatBandStyles(band) {
  switch (band) {
    case NITAQAT_BANDS.platinum:
      return {
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        bar: "bg-slate-300 dark:bg-slate-500",
      };
    case NITAQAT_BANDS.green:
      return {
        badge: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
        bar: "bg-emerald-500",
      };
    case NITAQAT_BANDS.yellow:
      return {
        badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        bar: "bg-amber-400",
      };
    case NITAQAT_BANDS.red:
    default:
      return {
        badge: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300",
        bar: "bg-red-500",
      };
  }
}
