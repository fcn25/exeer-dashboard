import { useCallback, useEffect, useState } from "react";
import { listCompanyBranches } from "../../services/branchService.js";
import {
  listEmployees,
  updateEmployeeWorkLocation,
} from "../../services/employeesService.js";
import WorkLocationSelect, {
  resolveWorkLocationLabel,
} from "./WorkLocationSelect.jsx";

export default function EmployeeBranchAssignments({ onToast }) {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [employeeRows, branchRows] = await Promise.all([
        listEmployees(),
        listCompanyBranches(),
      ]);
      setEmployees(employeeRows);
      setBranches(branchRows);
    } catch (err) {
      setError(err.message || "تعذّر تحميل بيانات الربط.");
      setEmployees([]);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignmentChange = async (employeeId, workLocationId) => {
    try {
      await updateEmployeeWorkLocation(employeeId, workLocationId);
      await loadData();
      onToast?.("تم تحديث موقع العمل للموظف.");
    } catch (err) {
      setError(err.message || "تعذّر تحديث موقع العمل.");
    }
  };

  return (
    <section className="md-surface overflow-hidden">
      <div className="border-b border-exeer-border px-5 py-4">
        <h2 className="text-sm font-bold text-exeer-primary">ربط الموظفين بالمواقع</h2>
        <p className="mt-0.5 text-xs text-exeer-muted">
          عيّن فرع العمل لكل موظف لتحديد نطاق البصمة المسموح
        </p>
      </div>

      {error ? (
        <p className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-exeer-border bg-exeer-surface">
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">الموظف</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">الإدارة</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">موقع العمل</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-exeer-muted">
                  جاري التحميل...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-exeer-muted">
                  لا يوجد موظفون لعرضهم.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-exeer-border last:border-b-0"
                >
                  <td className="px-5 py-3.5 font-medium text-exeer-primary">
                    {employee.full_name}
                  </td>
                  <td className="px-5 py-3.5 text-exeer-muted">
                    {employee.department || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {branches.length ? (
                      <WorkLocationSelect
                        employeeId={employee.id}
                        value={employee.work_location_id ?? ""}
                        branches={branches}
                        onUpdated={handleAssignmentChange}
                      />
                    ) : (
                      <span className="text-exeer-muted">
                        {resolveWorkLocationLabel(employee)}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
