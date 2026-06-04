import { useCallback, useEffect, useState } from "react";
import { fetchMyAdministrativeActions } from "../../services/administrativeActionsService.js";
import AdministrativeActionCard from "./AdministrativeActionCard.jsx";

/**
 * Read-only employee view of their administrative actions.
 * @param {{ employeeId: number | string | null }} props
 */
export default function EmployeeAdministrativeInbox({ employeeId }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!employeeId) {
      setError("لم يتم ربط حسابك بسجل موظف.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await fetchMyAdministrativeActions(employeeId);
      setRows(data);
    } catch (err) {
      setError(err.message || "تعذّر تحميل السجلات.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <p className="rounded-md border border-gray-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-none">
        جاري التحميل...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-none">
        لا توجد إجراءات إدارية مسجّلة عليك.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((action) => (
        <AdministrativeActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}
