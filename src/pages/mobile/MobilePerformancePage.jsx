import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LocaleShell from "../../components/ui/LocaleShell.jsx";

export default function MobilePerformancePage() {
  return (
    <LocaleShell className="mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-white font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]">
      <header className="native-mobile-app-bar sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]/95">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 text-slate-600"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">قياس الأداء</h1>
            <p className="text-xs text-slate-500">لوحة تنفيذية للمدير</p>
          </div>
        </div>
      </header>

      <main className="flex min-h-[50vh] items-center justify-center px-4 py-10 text-center">
        <p className="max-w-xs text-sm text-slate-500">
          جارٍ إعادة بناء نظام الأداء. سيتوفر هذا القسم قريباً بالتصميم الجديد.
        </p>
      </main>
    </LocaleShell>
  );
}
