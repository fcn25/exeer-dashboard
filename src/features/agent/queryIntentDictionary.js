/** Deterministic Arabic intent → RPC mapping (zero LLM cost) */

export function normalizeArabicText(text) {
  return String(text ?? "")
    .replace(/[\u0640]/g, "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(text) {
  return normalizeArabicText(text).split(/\s+/).filter(Boolean);
}

export function extractDaysFromText(text) {
  const normalized = normalizeArabicText(text);
  const western = normalized.match(/\d+/);
  if (western) return Math.min(Math.max(parseInt(western[0], 10), 1), 365);

  const easternDigits = "٠١٢٣٤٥٦٧٨٩";
  const easternMatch = normalized.match(/[٠-٩]+/);
  if (easternMatch) {
    const value = easternMatch[0]
      .split("")
      .map((ch) => easternDigits.indexOf(ch))
      .join("");
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.min(Math.max(parsed, 1), 365);
  }

  return null;
}

/** @typedef {{ id: string, rpc: string, params?: Record<string, unknown>, label: string, keywords: string[], minScore?: number, daysSlot?: boolean }} QueryIntent */

/** @type {QueryIntent[]} */
export const QUERY_INTENTS = [
  {
    id: "active_count",
    rpc: "q_active_employees_count",
    label: "كم عدد الموظفين النشطين؟",
    keywords: ["كم", "عدد", "نشط", "نشطين", "موظف", "موظفين", "يعمل", "يعملون", "العدد"],
    minScore: 2,
  },
  {
    id: "attendance_today",
    rpc: "q_attendance_today",
    label: "من حضر اليوم ومن تأخر؟",
    keywords: ["متاخر", "متاخرين", "حضور", "اجازه", "اليوم", "غائب", "غياب", "تاخير", "نبض"],
    minScore: 2,
  },
  {
    id: "iqamas_expiring",
    rpc: "q_iqamas_expiring",
    label: "اعرض الإقامات التي تنتهي قريباً",
    keywords: ["اقامه", "اقامات", "تنتهي", "منتهيه", "تجديد", "الاقامه", "iqama"],
    minScore: 2,
    daysSlot: true,
  },
  {
    id: "contracts_expiring",
    rpc: "q_contracts_expiring",
    label: "اعرض العقود التي تنتهي قريباً",
    keywords: ["عقد", "عقود", "تنتهي", "انتهاء", "العقد", "ذكرى", "سنوي"],
    minScore: 2,
    daysSlot: true,
  },
  {
    id: "no_annual_leave",
    rpc: "q_employees_without_annual_leave",
    label: "من لم يأخذ إجازة سنوية هذا العام؟",
    keywords: ["اجازه", "اجازات", "سنويه", "بدون", "لم", "ياخذ", "رصيد", "لم ياخذ"],
    minScore: 2,
  },
  {
    id: "pending_approvals",
    rpc: "q_pending_approvals",
    label: "ما الطلبات المعلقة التي تحتاج موافقتي؟",
    keywords: ["طلبات", "معلقه", "موافقتي", "بانتظار", "موافقه", "معلق", "تحتاج"],
    minScore: 2,
  },
];

function scoreIntent(intent, tokens) {
  let score = 0;
  for (const keyword of intent.keywords) {
    const normalizedKeyword = normalizeArabicText(keyword);
    if (tokens.some((token) => token.includes(normalizedKeyword) || normalizedKeyword.includes(token))) {
      score += 1;
    }
    if (tokens.join(" ").includes(normalizedKeyword)) {
      score += 1;
    }
  }
  return score;
}

/**
 * @param {string} text
 * @returns {{ intent: QueryIntent, params: Record<string, unknown>, score: number } | null}
 */
export function matchQueryIntent(text) {
  const tokens = tokenize(text);
  if (!tokens.length) return null;

  let best = null;
  for (const intent of QUERY_INTENTS) {
    const score = scoreIntent(intent, tokens);
    const minScore = intent.minScore ?? 2;
    if (score >= minScore && (!best || score > best.score)) {
      const params = { ...(intent.params ?? {}) };
      if (intent.daysSlot) {
        params.p_days = extractDaysFromText(text) ?? (intent.rpc === "q_contracts_expiring" ? 90 : 30);
      }
      best = { intent, params, score };
    }
  }

  return best;
}

/**
 * @param {string} text
 * @returns {QueryIntent[]}
 */
export function getMatchingIntents(text) {
  const tokens = tokenize(text);
  if (!tokens.length) {
    return QUERY_INTENTS.slice(0, 4);
  }

  return QUERY_INTENTS
    .map((intent) => ({ intent, score: scoreIntent(intent, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.intent);
}

const WRITE_VERB_PATTERN =
  /(?:^|\s|^)(?:غير|اضف|احذف|ارسل|عدل|نفذ|رق|سجل|وافق|حدث|انقل|الغ|قدم|نقل|ازل|حذف|رفع|خفض|عين|فصل)/;

export function looksLikeWriteCommand(text) {
  const normalized = normalizeArabicText(text);
  if (!normalized) return false;
  return WRITE_VERB_PATTERN.test(normalized);
}

export function hasStructuredMatches(text, employeeCount = 0) {
  const normalized = normalizeArabicText(text);
  if (!normalized) return false;
  return getMatchingIntents(text).length > 0 || employeeCount > 0;
}
