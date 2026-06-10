import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, X } from "lucide-react";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import CreateAdministrativeActionForm from "../../components/administrative/CreateAdministrativeActionForm.jsx";
import AdministrativeActionCard from "../../components/administrative/AdministrativeActionCard.jsx";
import {
  createAdministrativeAction,
  fetchAdministrativeActionsMasterLog,
} from "../../services/administrativeActionsService.js";
import { listEmployees } from "../../services/employeesService.js";
import { ensureArray } from "../../utils/ensureArray.js";
import MobileLoadingState from "../../components/mobile/MobileLoadingState.jsx";
import LocaleShell from "../../components/ui/LocaleShell.jsx";

export default function MobileAdministrativeActionsPage() {
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [employeeList, log] = await Promise.all([
        listEmployees(),
        fetchAdministrativeActionsMasterLog(),
      ]);
      setEmployees(ensureArray(employeeList));
      setRows(ensureArray(log));
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
      setIsFormOpen(false);
      setSuccessToast("تم إصدار الإجراء الإداري بنجاح");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocaleShell className="mx-auto min-h-screen w-full max-w-[480px] bg-white font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]">
      <header className="native-mobile-app-bar sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]/95">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-slate-600"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">الإجراءات الإدارية</h1>
            <p className="text-xs text-slate-500">إصدار ومتابعة السجل</p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-5 pb-24">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <MobileLoadingState />
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-slate-500">
            لا توجد إجراءات مسجّلة
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((action) =>
              action?.id != null ? (
                <AdministrativeActionCard
                  key={action.id}
                  action={action}
                  showEmployee
                />
              ) : null,
            )}
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-none"
        aria-label="إصدار إجراء"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      {isFormOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/35">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إغلاق"
            onClick={() => setIsFormOpen(false)}
          />
          <div className="relative max-h-[90vh] overflow-y-auto rounded-t-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">إجراء جديد</h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <CreateAdministrativeActionForm
              employees={ensureArray(employees)}
              onSubmit={handleCreate}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      ) : null}

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </LocaleShell>
  );
}
