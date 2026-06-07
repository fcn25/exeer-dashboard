import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Mail, Pencil, Plus, Search, Trophy } from "lucide-react";
import EmployeeFormSections from "./components/employees/EmployeeFormSections.jsx";
import LogAchievementModal from "./components/achievements/LogAchievementModal.jsx";
import {
  EMPTY_EMPLOYEE_FORM,
  getInitials,
  mapRowToEmployeeForm,
} from "./components/employees/employeeFormShared.js";
import SlideOver, { BulkImportButton } from "./components/employees/SlideOver.jsx";
import ExeerEmptyState from "./components/brand/ExeerEmptyState.jsx";
import BulkImportModal from "./components/employees/BulkImportModal.jsx";
import SuccessToast from "./components/ui/SuccessToast.jsx";
import { fetchCompanyBilling } from "./services/billingService.js";
import {
  createEmployee,
  getEmployeeById,
  inviteEmployeesWithoutAccounts,
  listEmployees,
  updateEmployee,
  updateEmployeeWorkLocation,
} from "./services/employeesService.js";
import { listBranchSelectOptions } from "./services/branchService.js";
import WorkLocationSelect, {
  resolveWorkLocationLabel,
} from "./components/attendance/WorkLocationSelect.jsx";
import { listDepartments, listJobTitles } from "./services/catalogService.js";
import {
  canAddEmployeeCount,
  EMPLOYEE_LIMIT_ERROR_AR,
} from "./utils/employeeLimitGuard.js";
import {
  canEditEmployeeRecords,
  getCurrentUserRole,
} from "./utils/rbac.js";

function mapDirectoryRow(item, index) {
  if (!item || typeof item !== "object") return null;

  const id = item.id ?? item.employee_id;
  const full_name = String(item.full_name ?? "").trim();
  const employee_number = String(item.employee_number ?? "").trim();
  const department = String(item.department ?? "").trim();
  const job_title_name = String(item.job_title_name ?? "").trim();
  const employment_status = String(item.employment_status ?? "نشط").trim();

  if (!id && !full_name) return null;

  return {
    id: String(id ?? `emp-${index}`),
    full_name: full_name || "—",
    employee_number: employee_number || "—",
    department: department || "—",
    job_title_name: job_title_name || "—",
    employment_status,
    email: String(item.email ?? ""),
    work_location_id: item.work_location_id ?? null,
    company_branches: item.company_branches ?? null,
  };
}

function StatusBadge({ status }) {
  const active =
    status === "نشط" || status === "Active" || status === "active";
  const tone = active
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : status === "إجازة"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-600 border-exeer-border";

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

function AddEmployeeSlideOver({
  isOpen,
  onClose,
  onCreated,
  onOpenBulkImport,
  departmentOptions,
  jobTitleOptions,
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
      setError("البريد الإلكتروني مطلوب لإرسال دعوة الدخول للموظف.");
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
      const created = await createEmployee(form);
      await onCreated();
      if (created.invitationSent) {
        setSuccessMessage(
          `تم حفظ الموظف وإرسال دعوة الدخول إلى ${form.email.trim()}.`,
        );
        setTimeout(() => onClose(), 1400);
        return;
      }
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
      topAction={<BulkImportButton onClick={onOpenBulkImport} />}
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
        />
      </form>
    </SlideOver>
  );
}

function EmployeeDetailsSlideOver({
  employeeId,
  isOpen,
  onClose,
  onSave,
  departmentOptions,
  jobTitleOptions,
  canEdit,
  userRole,
}) {
  const [form, setForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLogAchievementOpen, setIsLogAchievementOpen] = useState(false);
  const [achievementSuccess, setAchievementSuccess] = useState("");

  useEffect(() => {
    if (!isOpen || !employeeId) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");
      setSaveError("");
      setIsEditing(false);
      setAchievementSuccess("");

      try {
        const row = await getEmployeeById(employeeId);
        if (cancelled) return;
        if (!row) {
          setLoadError("لم يتم العثور على الموظف.");
          return;
        }
        setForm(mapRowToEmployeeForm(row));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "تعذّر تحميل بيانات الموظف.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, employeeId]);

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

  useEffect(() => {
    if (!achievementSuccess) return undefined;
    const timer = setTimeout(() => setAchievementSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [achievementSuccess]);

  const fieldsDisabled = !canEdit || !isEditing || isSaving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canEdit || !isEditing) return;

    setIsSaving(true);
    setSaveError("");

    try {
      await updateEmployee(form.id, form);
      await onSave();
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "تعذّر حفظ التعديلات.");
    } finally {
      setIsSaving(false);
    }
  };

  const footer =
    canEdit && isEditing ? (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setSaveError("");
          }}
          className="md-btn-tonal flex-1"
          disabled={isSaving}
        >
          إلغاء التعديل
        </button>
        <button
          type="submit"
          form="employee-details-form"
          disabled={isSaving || isLoading}
          className="md-btn-primary flex-1"
        >
          {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    ) : (
      <p className="text-center text-xs text-exeer-muted">
        {canEdit
          ? "اضغط «تعديل» لتغيير بيانات الموظف"
          : `وضع العرض فقط — صلاحية ${userRole}`}
      </p>
    );

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل الموظف"
      subtitle={
        canEdit
          ? "يمكنك عرض البيانات أو تعديلها حسب صلاحيتك"
          : "عرض البيانات فقط — لا تملك صلاحية التعديل"
      }
      footer={footer}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isLoading && !loadError ? (
            <button
              type="button"
              onClick={() => setIsLogAchievementOpen(true)}
              className="md-btn-primary inline-flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" aria-hidden />
              إضافة إنجاز
            </button>
          ) : null}
        </div>

        {!canEdit ? (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
            قراءة فقط
          </span>
        ) : !isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="md-btn-tonal inline-flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            تعديل
          </button>
        ) : (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            وضع التعديل
          </span>
        )}
      </div>

      {achievementSuccess ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {achievementSuccess}
        </p>
      ) : null}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-exeer-muted">جاري التحميل...</p>
      ) : loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : (
        <form id="employee-details-form" onSubmit={handleSubmit}>
          {saveError ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {saveError}
            </p>
          ) : null}

          <EmployeeFormSections
            form={form}
            onChange={setForm}
            disabled={fieldsDisabled}
            departmentOptions={departmentOptions}
            jobTitleOptions={jobTitleOptions}
            branchOptions={branchOptions}
            branchesLoading={branchesLoading}
          />
        </form>
      )}

      <LogAchievementModal
        isOpen={isLogAchievementOpen}
        onClose={() => setIsLogAchievementOpen(false)}
        employeeId={employeeId}
        employeeName={form.full_name}
        onSuccess={() =>
          setAchievementSuccess("تم تسجيل الإنجاز بنجاح")
        }
      />
    </SlideOver>
  );
}

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("الكل");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [jobTitleOptions, setJobTitleOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [subscriptionTier, setSubscriptionTier] = useState("trial");
  const [isInvitingEmployees, setIsInvitingEmployees] = useState(false);

  const userRole = getCurrentUserRole();
  const canEdit = canEditEmployeeRecords();

  const loadEmployees = useCallback(async () => {
    setIsListLoading(true);
    setListError("");

    try {
      const data = await listEmployees();
      setEmployees(data.map(mapDirectoryRow).filter(Boolean));
    } catch (err) {
      setListError(err.message || "تعذّر جلب قائمة الموظفين.");
      setEmployees([]);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingTier() {
      try {
        const billing = await fetchCompanyBilling();
        if (!cancelled) setSubscriptionTier(billing.subscription_tier);
      } catch {
        if (!cancelled) setSubscriptionTier("trial");
      }
    }

    loadBillingTier();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const [departments, jobTitles, branches] = await Promise.all([
          listDepartments(),
          listJobTitles(),
          listBranchSelectOptions().catch(() => []),
        ]);
        if (!cancelled) {
          setDepartmentOptions(departments);
          setJobTitleOptions(jobTitles);
          setBranchOptions(branches);
        }
      } catch {
        if (!cancelled) {
          setDepartmentOptions([]);
          setJobTitleOptions([]);
          setBranchOptions([]);
        }
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setIsAddOpen(true);
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get("bulkImport") === "1") {
      setIsBulkImportOpen(true);
      setSearchParams({}, { replace: true });
    }
    const employeeId = searchParams.get("employee");
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
      setIsDetailsOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filterOptions = useMemo(
    () => ["الكل", ...departmentOptions],
    [departmentOptions],
  );

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((emp) => {
      const matchesDept =
        departmentFilter === "الكل" || emp.department === departmentFilter;
      if (!matchesDept) return false;
      if (!query) return true;

      return (
        emp.full_name.toLowerCase().includes(query) ||
        emp.employee_number.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query)
      );
    });
  }, [employees, departmentFilter, searchQuery]);

  const openDetails = (employee) => {
    setSelectedEmployeeId(employee.id);
    setIsDetailsOpen(true);
  };

  const handleMutationSuccess = async (message) => {
    await loadEmployees();
    setSuccessMessage(message);
  };

  const handleInlineWorkLocationChange = async (employeeId, workLocationId) => {
    await updateEmployeeWorkLocation(employeeId, workLocationId);
    await loadEmployees();
    setSuccessMessage("تم تحديث موقع العمل.");
  };

  const handleInviteEmployees = async () => {
    setIsInvitingEmployees(true);
    setListError("");

    try {
      const { invitesSent } = await inviteEmployeesWithoutAccounts();
      setSuccessMessage(`تم إرسال ${invitesSent} دعوة بنجاح`);
    } catch (err) {
      setListError(err.message || "تعذّر إرسال الدعوات.");
    } finally {
      setIsInvitingEmployees(false);
    }
  };

  return (
    <div className="md-page">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="md-page-title">إدارة الموظفين</h1>
          <p className="text-sm text-exeer-muted">
            إدارة سجلات الموظفين —{" "}
            <span className="font-medium text-exeer-primary">{userRole}</span>
            {!canEdit ? " (عرض فقط)" : null}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-3 self-start sm:flex-row">
            <button
              type="button"
              onClick={handleInviteEmployees}
              disabled={isInvitingEmployees || isListLoading}
              className="md-btn-tonal inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mail className="h-5 w-5" aria-hidden />
              {isInvitingEmployees ? "جاري إرسال الدعوات..." : "دعوة الموظفين"}
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="md-btn-primary inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" aria-hidden />
              إضافة موظف جديد
            </button>
          </div>
        ) : null}
      </header>

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-exeer-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الرقم، أو الإدارة..."
            className="md-input pr-11"
            disabled={isListLoading}
          />
        </div>
        <div className="w-full lg:w-56">
          <label
            htmlFor="department-filter"
            className="mb-2 block text-sm font-medium text-exeer-primary"
          >
            الإدارة
          </label>
          <select
            id="department-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            disabled={isListLoading}
            className="md-input"
          >
            {filterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="md-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-exeer-border bg-exeer-surface">
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  الموظف
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  رقم الموظف
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  المسمى
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  الإدارة
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  موقع العمل
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  الحالة
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {isListLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-exeer-muted"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-exeer-muted"
                  >
                    {listError}
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <ExeerEmptyState message="لا يوجد موظفون مطابقون للبحث" />
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-exeer-border transition-colors last:border-b-0 hover:bg-exeer-surface/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-exeer-border bg-white text-sm font-bold text-exeer-primary">
                          {getInitials(employee.full_name)}
                        </span>
                        <div>
                          <p className="font-semibold text-exeer-primary">
                            {employee.full_name}
                          </p>
                          {employee.email ? (
                            <p className="text-xs text-exeer-muted">
                              {employee.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-exeer-muted">
                      {employee.employee_number}
                    </td>
                    <td className="px-5 py-4 text-exeer-muted">
                      {employee.job_title_name}
                    </td>
                    <td className="px-5 py-4">{employee.department}</td>
                    <td className="px-5 py-4">
                      {canEdit && branchOptions.length ? (
                        <WorkLocationSelect
                          employeeId={employee.id}
                          value={employee.work_location_id ?? ""}
                          branches={branchOptions}
                          onUpdated={handleInlineWorkLocationChange}
                        />
                      ) : (
                        <span className="text-exeer-muted">
                          {resolveWorkLocationLabel(employee)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={employee.employment_status} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openDetails(employee)}
                        className="md-btn-tonal inline-flex items-center gap-2 px-3 py-2 text-xs"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeSlideOver
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onOpenBulkImport={() => {
          setIsAddOpen(false);
          setIsBulkImportOpen(true);
        }}
        departmentOptions={departmentOptions}
        jobTitleOptions={jobTitleOptions}
        employeeCount={employees.length}
        subscriptionTier={subscriptionTier}
        onCreated={() => handleMutationSuccess("تم إضافة الموظف بنجاح")}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(result) =>
          handleMutationSuccess(
            `تم استيراد ${result.imported} موظف بنجاح${
              result.invitesSent
                ? ` · أُرسلت ${result.invitesSent} دعوة`
                : ""
            }${
              result.invitesSkippedNoEmail
                ? ` · تُركت ${result.invitesSkippedNoEmail} بدون دعوة (بريد غير متوفر)`
                : ""
            }`,
          )
        }
      />

      {isDetailsOpen && selectedEmployeeId ? (
        <EmployeeDetailsSlideOver
          key={selectedEmployeeId}
          employeeId={selectedEmployeeId}
          isOpen={isDetailsOpen}
          canEdit={canEdit}
          userRole={userRole}
          departmentOptions={departmentOptions}
          jobTitleOptions={jobTitleOptions}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedEmployeeId(null);
          }}
          onSave={() => handleMutationSuccess("تم حفظ التعديلات بنجاح")}
        />
      ) : null}
    </div>
  );
}
