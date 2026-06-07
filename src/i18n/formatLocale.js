import i18n from "./index.js";

/** Arabic UI dates always use the Gregorian calendar. */
const GREGORIAN_AR_LOCALE = "ar-SA-u-ca-gregory";

function currentLang() {
  return i18n.language?.startsWith("en") ? "en" : "ar";
}

export function getAppDateLocale() {
  return currentLang() === "en" ? "en-US" : GREGORIAN_AR_LOCALE;
}

export function getAppNumberLocale() {
  return currentLang() === "en" ? "en-US" : "ar-SA";
}

export function formatLocaleNumber(value, options = {}) {
  return new Intl.NumberFormat(getAppNumberLocale(), options).format(
    Number(value) || 0,
  );
}

export function formatLocaleDate(value, options = {}) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(getAppDateLocale(), options).format(
      new Date(value),
    );
  } catch {
    return String(value);
  }
}

export function formatLocaleHeaderDate(date = new Date()) {
  return new Intl.DateTimeFormat(getAppDateLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
