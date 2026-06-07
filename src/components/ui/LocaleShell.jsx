import { useAppLocale } from "../../i18n/useAppLocale.js";

/** Applies document language direction to a page section. */
export default function LocaleShell({ children, className = "", as: Tag = "div" }) {
  const { dir, lang } = useAppLocale();
  return (
    <Tag dir={dir} lang={lang} className={className}>
      {children}
    </Tag>
  );
}
