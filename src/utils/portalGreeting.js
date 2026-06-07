import { formatLocaleDate } from "../i18n/formatLocale.js";

export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "صباح الخير";
  if (hour >= 12 && hour < 17) return "مساء الخير";
  return "مساء الخير";
}

export function formatPortalDate(value) {
  return formatLocaleDate(value, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
