import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import CreateAdministrativeActionForm from "../../components/administrative/CreateAdministrativeActionForm.jsx";
import AdministrativeActionCard from "../../components/administrative/AdministrativeActionCard.jsx";
import {
  HOME_BTN_PRIMARY,
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  MOBILE_CARD,
} from "../../components/home/homeStyles.js";
import MobilePageShell, {
  MobileStandaloneHeader,
} from "../../components/mobile/MobilePageShell.jsx";
import {
  createAdministrativeAction,
  fetchAdministrativeActionsMasterLog,
} from "../../services/administrativeActionsService.js";
import { listEmployees } from "../../services/employeesService.js";
import { ensureArray } from "../../utils/ensureArray.js";
import MobileLoadingState from "../../components/mobile/MobileLoadingState.jsx";

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
    <MobilePageShell>
      <MobileStandaloneHeader
        title="الإجراءات الإدارية"
        subtitle="إصدار ومتابعة السجل"
      />

      <main className="space-y-4 px-4 py-5 pb-24">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <MobileLoadingState />
        ) : rows.length === 0 ? (
          <div className={`${MOBILE_CARD} px-4 py-10 text-center text-sm text-exeer-muted`}>
            لا توجد إجراءات مسجّلة
          </div>
        ) : (
          <div className={MOBILE_CARD}>
            <div className={HOME_LIST_DIVIDE}>
              {rows.map((action) =>
                action?.id != null ? (
                  <div key={action.id} className={HOME_LIST_ITEM}>
                    <AdministrativeActionCard
                      action={action}
                      showEmployee
                      embedded
                    />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className={`${HOME_BTN_PRIMARY} fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full`}
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
    </MobilePageShell>
  );
}
