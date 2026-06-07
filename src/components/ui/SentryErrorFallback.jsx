import i18n from "../../i18n/index.js";
import { resolveAppDir, resolveAppLang } from "../../i18n/useAppLocale.js";

export default function SentryErrorFallback() {
  const lang = resolveAppLang(i18n.language);
  const dir = resolveAppDir(i18n.language);

  return (
    <div
      dir={dir}
      lang={lang}
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center"
    >
      <div className="max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-gray-800">
          {i18n.t("app.errorTitle")}
        </h1>
        <p className="mb-4 text-gray-600">{i18n.t("app.errorBody")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
        >
          {i18n.t("app.errorRefresh")}
        </button>
      </div>
    </div>
  );
}
