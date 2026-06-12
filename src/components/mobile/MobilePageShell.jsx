import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  MOBILE_APP_BAR,
  MOBILE_BACK_BTN,
  MOBILE_PAGE_SHELL,
  MOBILE_SHELL,
  TYPE_META,
  TYPE_SECTION,
} from "../home/homeStyles.js";

export function MobileBackLink({ to = "/mobile", ariaLabel = "رجوع" }) {
  return (
    <Link to={to} className={MOBILE_BACK_BTN} aria-label={ariaLabel}>
      <ArrowRight className="h-5 w-5" aria-hidden />
    </Link>
  );
}

export function MobileStandaloneHeader({
  title,
  subtitle,
  icon: Icon,
  backTo = "/mobile",
  backLabel = "رجوع",
  children,
}) {
  return (
    <header className={MOBILE_APP_BAR}>
      <div className="flex items-center gap-3 px-4 py-3">
        <MobileBackLink to={backTo} ariaLabel={backLabel} />
        <div className="min-w-0 flex-1">
          {Icon ? (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <h1 className={`${TYPE_SECTION} truncate text-lg`}>{title}</h1>
            </div>
          ) : (
            <h1 className={`${TYPE_SECTION} truncate text-lg`}>{title}</h1>
          )}
          {subtitle ? (
            <p className={`${TYPE_META} mt-0.5 truncate`}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </header>
  );
}

export default function MobilePageShell({
  children,
  native = false,
  dir,
  lang,
  className = "",
}) {
  const shellClass = native ? MOBILE_SHELL : MOBILE_PAGE_SHELL;
  return (
    <div dir={dir} lang={lang} className={`${shellClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
