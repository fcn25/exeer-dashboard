import { Component } from "react";
import i18n from "../i18n/index.js";
import { resolveAppDir, resolveAppLang } from "../i18n/useAppLocale.js";

/**
 * Catches render errors so the app shows a fallback instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const message = error?.message ?? String(error);
    console.error("[ErrorBoundary]", message, errorInfo?.componentStack ?? errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const lang = resolveAppLang(i18n.language);
      const dir = resolveAppDir(i18n.language);

      return (
        <div
          dir={dir}
          lang={lang}
          className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-4 bg-white px-6 py-12 text-center font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]"
        >
          <p className="text-base font-bold text-slate-900">
            {i18n.t("app.errorTitle")}
          </p>
          <p className="text-sm text-slate-500">{i18n.t("app.errorBody")}</p>
          <button
            type="button"
            onClick={this.handleRefresh}
            className="md-btn-primary min-h-[44px] px-6"
          >
            {i18n.t("app.errorRefresh")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
