import { useCallback, useEffect, useState } from "react";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import CreateAdministrativeActionForm from "../components/administrative/CreateAdministrativeActionForm.jsx";
import AdministrativeActionsTable from "../components/administrative/AdministrativeActionsTable.jsx";
import {
  createAdministrativeAction,
  fetchAdministrativeActionsMasterLog,
} from "../services/administrativeActionsService.js";
import { listEmployees } from "../services/employeesService.js";

const SUBTITLE =
  "إصدار ومتابعة الإجراءات الإدارية المباشرة — بدون سلسلة موافقات.";

export default function AdministrativeActionsPage() {
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [employeeList, log] = await Promise.all([
        listEmployees(),
        fetchAdministrativeActionsMasterLog(),
      ]);
      setEmployees(employeeList);
      setRows(log);
    } catch (err) {
      setError(err.message || "تعذّر تحميل البيانات.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    try {
      await createAdministrativeAction(payload);
      await loadData();
      setSuccessToast("تم إصدار الإجراء الإداري بنجاح");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="md-page space-y-6">
      <header className="space-y-2">
        <h1 className="md-page-title">الإجراءات الإدارية</h1>
        <p className="md-page-subtitle max-w-3xl">{SUBTITLE}</p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <CreateAdministrativeActionForm
            employees={employees}
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
          />
        </div>
        <div className="space-y-3 xl:col-span-8">
          <h2 className="text-base font-bold text-slate-900">سجل الإجراءات</h2>
          <AdministrativeActionsTable rows={rows} isLoading={isLoading} />
        </div>
      </div>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
