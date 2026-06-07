import { isDateInRange } from "../utils/calendarDates.js";

/**
 * عطل رسمية سعودية — تُعرض تلقائياً لكل المنشآت.
 * التواريخ الثابتة: يوم التأسيس (22 فبراير)، اليوم الوطني (23 سبتمبر).
 * عيد الفطر وعيد الأضحى: حسب إعلانات التقويم الأم القرى — يُحدَّث الملف سنوياً.
 * المصدر المرجعي: calendriers.uq.edu.sa / إعلانات وزارة الموارد البشرية.
 */
const EID_HOLIDAY_DAYS_BY_YEAR = {
  2024: {
    fitr: ["2024-04-10", "2024-04-11", "2024-04-12", "2024-04-13"],
    adha: ["2024-06-16", "2024-06-17", "2024-06-18", "2024-06-19"],
  },
  2025: {
    fitr: ["2025-03-30", "2025-03-31", "2025-04-01", "2025-04-02", "2025-04-03"],
    adha: ["2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10"],
  },
  2026: {
    fitr: ["2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24"],
    adha: ["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31"],
  },
  2027: {
    fitr: ["2027-03-09", "2027-03-10", "2027-03-11", "2027-03-12", "2027-03-13"],
    adha: ["2027-05-16", "2027-05-17", "2027-05-18", "2027-05-19", "2027-05-20"],
  },
  2028: {
    fitr: ["2028-02-26", "2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"],
    adha: ["2028-05-05", "2028-05-06", "2028-05-07", "2028-05-08", "2028-05-09"],
  },
  2029: {
    fitr: ["2029-02-14", "2029-02-15", "2029-02-16", "2029-02-17", "2029-02-18"],
    adha: ["2029-04-24", "2029-04-25", "2029-04-26", "2029-04-27", "2029-04-28"],
  },
  2030: {
    fitr: ["2030-02-04", "2030-02-05", "2030-02-06", "2030-02-07", "2030-02-08"],
    adha: ["2030-04-13", "2030-04-14", "2030-04-15", "2030-04-16", "2030-04-17"],
  },
};

const HOLIDAY_LABELS = {
  founding: {
    ar: "يوم التأسيس",
    en: "Founding Day",
    subtitleAr: "عطلة رسمية — المملكة العربية السعودية",
    subtitleEn: "Official holiday — Kingdom of Saudi Arabia",
  },
  national: {
    ar: "اليوم الوطني",
    en: "National Day",
    subtitleAr: "عطلة رسمية — المملكة العربية السعودية",
    subtitleEn: "Official holiday — Kingdom of Saudi Arabia",
  },
  fitr: {
    ar: "عيد الفطر",
    en: "Eid al-Fitr",
    subtitleAr: "عطلة رسمية — إجازة العيد",
    subtitleEn: "Official holiday — Eid break",
  },
  adha: {
    ar: "عيد الأضحى",
    en: "Eid al-Adha",
    subtitleAr: "عطلة رسمية — إجازة العيد",
    subtitleEn: "Official holiday — Eid break",
  },
};

function buildFixedHolidays(year, lang) {
  const isEn = lang === "en";
  return [
    {
      id: `sa-holiday-founding-${year}`,
      date: `${year}-02-22`,
      kind: "holiday",
      holidayKey: "founding",
      title: isEn ? HOLIDAY_LABELS.founding.en : HOLIDAY_LABELS.founding.ar,
      subtitle: isEn ? HOLIDAY_LABELS.founding.subtitleEn : HOLIDAY_LABELS.founding.subtitleAr,
    },
    {
      id: `sa-holiday-national-${year}`,
      date: `${year}-09-23`,
      kind: "holiday",
      holidayKey: "national",
      title: isEn ? HOLIDAY_LABELS.national.en : HOLIDAY_LABELS.national.ar,
      subtitle: isEn ? HOLIDAY_LABELS.national.subtitleEn : HOLIDAY_LABELS.national.subtitleAr,
    },
  ];
}

function buildEidHolidays(year, lang) {
  const pack = EID_HOLIDAY_DAYS_BY_YEAR[year];
  if (!pack) return [];

  const isEn = lang === "en";
  const entries = [];

  for (const date of pack.fitr) {
    entries.push({
      id: `sa-holiday-fitr-${date}`,
      date,
      kind: "holiday",
      holidayKey: "fitr",
      title: isEn ? HOLIDAY_LABELS.fitr.en : HOLIDAY_LABELS.fitr.ar,
      subtitle: isEn ? HOLIDAY_LABELS.fitr.subtitleEn : HOLIDAY_LABELS.fitr.subtitleAr,
    });
  }

  for (const date of pack.adha) {
    entries.push({
      id: `sa-holiday-adha-${date}`,
      date,
      kind: "holiday",
      holidayKey: "adha",
      title: isEn ? HOLIDAY_LABELS.adha.en : HOLIDAY_LABELS.adha.ar,
      subtitle: isEn ? HOLIDAY_LABELS.adha.subtitleEn : HOLIDAY_LABELS.adha.subtitleAr,
    });
  }

  return entries;
}

function yearsBetween(start, end) {
  const startYear = Number.parseInt(String(start).slice(0, 4), 10);
  const endYear = Number.parseInt(String(end).slice(0, 4), 10);
  const years = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }
  return years;
}

/** عطل رسمية سعودية ضمن نطاق تاريخ (شامل) — تظهر لجميع المنشآت. */
export function getSaudiPublicHolidaysInRange(start, end, lang = "ar") {
  const normalizedLang = lang?.startsWith("en") ? "en" : "ar";
  const seen = new Set();
  const holidays = [];

  for (const year of yearsBetween(start, end)) {
    const yearHolidays = [
      ...buildFixedHolidays(year, normalizedLang),
      ...buildEidHolidays(year, normalizedLang),
    ];

    for (const item of yearHolidays) {
      if (!isDateInRange(item.date, start, end)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      holidays.push(item);
    }
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
