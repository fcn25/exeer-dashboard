import { useEffect, useState } from "react";
import EmployeeFormSections from "./EmployeeFormSections.jsx";
import { EMPTY_EMPLOYEE_FORM } from "./employeeFormShared.js";
import SlideOver, { BulkImportButton } from "./SlideOver.jsx";
import SuccessToast from "../ui/SuccessToast.jsx";
import { createEmployee } from "../../services/employeesService.js";
import { listBranchSelectOptions } from "../../services/branchService.js";
import {
  canAddEmployeeCount,
  EMPLOYEE_LIMIT_ERROR_AR,
} from "../../utils/employeeLimitGuard.js";

export default function AddEmployeeSlideOver({
  isOpen,
  onClose,
  onCreated,
  onOpenBulkImport,
  departmentOptions,
  jobTitleOptions,
  managerOptions = [],
  employeeCount = 0,
  subscriptionTier = "trial",
}) {
  const [form, setForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [limitToast, setLimitToast] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_EMPLOYEE_FORM });
      setError("");
      setSuccessMessage("");
      setLimitToast("");
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function loadBranches() {
      setBranchesLoading(true);
      try {
        const branches = await listBranchSelectOptions();
        if (!cancelled) setBranchOptions(branches);
      } catch {
        if (!cancelled) setBranchOptions([]);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim()) {
      setError("الاسم الكامل مطلوب.");
      return;
    }
    if (!form.email?.trim()) {
      setError("البريد الإلكتروني مطلوب.");
      return;
    }

    const limitCheck = canAddEmployeeCount(employeeCount, 1, subscriptionTier);
    if (!limitCheck.allowed) {
      setLimitToast(EMPLOYEE_LIMIT_ERROR_AR);
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await createEmployee(form);
      await onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر إضافة الموظف.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة موظف جديد"
      subtitle="أدخل بيانات الموظف في الأقسام التالية"
      topAction={
        onOpenBulkImport ? (
          <BulkImportButton onClick={onOpenBulkImport} />
        ) : null
      }
      footer={
        <button
          type="submit"
          form="add-employee-form"
          disabled={isSaving}
          className="md-btn-primary w-full"
        >
          {isSaving ? "جاري الحفظ..." : "حفظ الموظف"}
        </button>
      }
    >
      <SuccessToast message={limitToast} onDismiss={() => setLimitToast("")} />
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </p>
      ) : null}

      <form id="add-employee-form" onSubmit={handleSave}>
        <EmployeeFormSections
          form={form}
          onChange={setForm}
          departmentOptions={departmentOptions}
          jobTitleOptions={jobTitleOptions}
          branchOptions={branchOptions}
          branchesLoading={branchesLoading}
          managerOptions={managerOptions}
        />
      </form>
    </SlideOver>
  );
}
