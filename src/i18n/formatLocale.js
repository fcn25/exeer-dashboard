import i18n from "./index.js";

function currentLang() {
  return i18n.language?.startsWith("en") ? "en" : "ar";
}

export function formatLocaleNumber(value, options = {}) {
  const locale = currentLang() === "en" ? "en-US" : "ar-SA";
  return new Intl.NumberFormat(locale, options).format(Number(value) || 0);
}

export function formatLocaleDate(value, options = {}) {
  if (!value) return "—";
  try {
    const locale = currentLang() === "en" ? "en-US" : "ar-SA";
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatLocaleHeaderDate(date = new Date()) {
  const locale = currentLang() === "en" ? "en-US" : "ar-SA";
  const gregorian = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  if (currentLang() === "en") return gregorian;

  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    hijri = "";
  }

  return hijri ? `${gregorian} · ${hijri}` : gregorian;
}
