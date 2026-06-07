import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Fingerprint } from "lucide-react";
import BranchGeofenceManager from "../components/attendance/BranchGeofenceManager.jsx";
import EmployeeBranchAssignments from "../components/attendance/EmployeeBranchAssignments.jsx";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import { useAppLocale } from "../i18n/useAppLocale.js";

export default function AttendanceSettingsPage() {
  const { t } = useAppLocale();
  const [successToast, setSuccessToast] = useState("");

  return (
    <div className="md-page">
      <header className="space-y-3">
        <Link
          to="/dashboard/attendance"
          className="inline-flex items-center gap-2 text-sm font-medium text-exeer-muted transition-colors hover:text-exeer-primary"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          العودة إلى سجل الحضور
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-exeer-primary">
            <Fingerprint className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="md-page-title">{t("pages.attendanceSettings.title")}</h1>
            <p className="text-sm text-exeer-muted">
              {t("pages.attendanceSettings.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <BranchGeofenceManager onToast={setSuccessToast} />

      <EmployeeBranchAssignments onToast={setSuccessToast} />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
