import { useTranslation } from "react-i18next";

export function resolveAppDir(language) {
  return String(language ?? "").startsWith("en") ? "ltr" : "rtl";
}

export function resolveAppLang(language) {
  return String(language ?? "").startsWith("en") ? "en" : "ar";
}

/** Shared RTL/LTR + language for page shells. */
export function useAppLocale() {
  const { i18n, t } = useTranslation();
  const language = i18n.language;
  const dir = resolveAppDir(language);
  const lang = resolveAppLang(language);
  const isEn = lang === "en";

  return { i18n, t, language, dir, lang, isEn };
}
