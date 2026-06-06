import { Link } from "react-router-dom";
import { ArrowRight, MapPinned } from "lucide-react";
import BranchLocationSetup from "../components/attendance/BranchLocationSetup.jsx";

export default function BranchGeofencingPage() {
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
            <MapPinned className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="md-page-title">مواقع الفروع — السياج الجغرافي</h1>
            <p className="text-sm text-exeer-muted">
              حدّد مواقع الفروع ونطاق الحضور المسموح للتحقق من البصمة الجغرافية.
            </p>
          </div>
        </div>
      </header>

      <BranchLocationSetup />
    </div>
  );
}
