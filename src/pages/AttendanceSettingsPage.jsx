import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Fingerprint } from "lucide-react";
import BranchLocationsTable from "../components/attendance/BranchLocationsTable.jsx";
import BranchLocationSetup from "../components/attendance/BranchLocationSetup.jsx";
import EmployeeBranchAssignments from "../components/attendance/EmployeeBranchAssignments.jsx";
import SlideOver from "../components/employees/SlideOver.jsx";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import { listCompanyBranches } from "../services/branchService.js";

export default function AttendanceSettingsPage() {
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await listCompanyBranches();
      setBranches(rows);
    } catch {
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const openCreate = () => {
    setEditingBranchId(null);
    setIsMapOpen(true);
  };

  const openEdit = (branchId) => {
    setEditingBranchId(branchId);
    setIsMapOpen(true);
  };

  const handleBranchSaved = async (_saved, message) => {
    await loadBranches();
    setSuccessToast(message);
    setIsMapOpen(false);
    setEditingBranchId(null);
  };

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
            <h1 className="md-page-title">إعدادات البصمة والمواقع</h1>
            <p className="text-sm text-exeer-muted">
              إدارة مواقع الفروع ونطاقات الحضور وربط الموظفين — للمالك فقط
            </p>
          </div>
        </div>
      </header>

      <BranchLocationsTable
        branches={branches}
        isLoading={isLoading}
        onAdd={openCreate}
        onEdit={openEdit}
      />

      <EmployeeBranchAssignments
        onToast={(message) => setSuccessToast(message)}
      />

      <SlideOver
        isOpen={isMapOpen}
        onClose={() => {
          setIsMapOpen(false);
          setEditingBranchId(null);
        }}
        title={editingBranchId ? "تعديل موقع الفرع" : "إضافة موقع فرع جديد"}
        subtitle="حدد الموقع على الخريطة ونصف القطر المسموح للحضور"
      >
        <BranchLocationSetup
          showBranchList={false}
          initialBranchId={editingBranchId}
          showInlineToast={false}
          onSaved={handleBranchSaved}
        />
      </SlideOver>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
