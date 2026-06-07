import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import "./index.css";
import App from "./App.jsx";
import i18n from "./i18n/index.js";
import { ThemeProvider } from "./providers/ThemeProvider.jsx";
import { bootstrapNativeAppShell } from "./utils/nativeAppShell.js";

// 💡 1. استيراد مكتبات Sentry هنا
import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";

// 💡 2. تفعيل Sentry (يجب أن يتم قبل تشغيل التطبيق)
Sentry.init({
  dsn: "https://3bb7f74787a4d00fb9eedcf11e2a7522@o451152363638400.ingest.us.sentry.io/4511523651059712",
}, SentryReact.init);

bootstrapNativeAppShell();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
);