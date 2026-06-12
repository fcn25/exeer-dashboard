import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { useTranslation } from "react-i18next";
import BranchGeofenceManager from "../../components/attendance/BranchGeofenceManager.jsx";
import EmployeeBranchAssignments from "../../components/attendance/EmployeeBranchAssignments.jsx";
import MobilePageShell, {
  MobileStandaloneHeader,
} from "../../components/mobile/MobilePageShell.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";

export default function MobileAttendanceSettingsPage() {
  const { i18n } = useTranslation();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";
  const [successToast, setSuccessToast] = useState("");

  return (
    <MobilePageShell dir={pageDir} lang={pageLang} className="pb-10">
      <MobileStandaloneHeader
        title="إعدادات البصمة والمواقع"
        subtitle="الفروع، النطاقات الجغرافية، وربط الموظفين"
        icon={Fingerprint}
      />

      <main className="space-y-4 px-4 py-4">
        <BranchGeofenceManager compact onToast={setSuccessToast} />
        <EmployeeBranchAssignments onToast={setSuccessToast} />
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </MobilePageShell>
  );
}
