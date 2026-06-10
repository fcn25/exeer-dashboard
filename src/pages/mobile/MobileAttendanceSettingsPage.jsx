import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Fingerprint } from "lucide-react";
import { useTranslation } from "react-i18next";
import BranchGeofenceManager from "../../components/attendance/BranchGeofenceManager.jsx";
import EmployeeBranchAssignments from "../../components/attendance/EmployeeBranchAssignments.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";

export default function MobileAttendanceSettingsPage() {
  const { i18n } = useTranslation();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";
  const [successToast, setSuccessToast] = useState("");

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-gray-50/80 pb-10 font-sans text-exeer-primary"
    >
      <header className="native-mobile-app-bar sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white text-exeer-primary shadow-sm transition-colors hover:bg-gray-50"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 shrink-0 text-exeer-primary" aria-hidden />
              <h1 className="truncate text-base font-bold">إعدادات البصمة والمواقع</h1>
            </div>
            <p className="text-[11px] text-exeer-muted">
              الفروع، النطاقات الجغرافية، وربط الموظفين
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <BranchGeofenceManager compact onToast={setSuccessToast} />
        <EmployeeBranchAssignments onToast={setSuccessToast} />
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
