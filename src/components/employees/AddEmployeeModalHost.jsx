import { useCallback, useEffect, useMemo, useState } from "react";
import AddEmployeeSlideOver from "./AddEmployeeSlideOver.jsx";
import BulkImportModal from "./BulkImportModal.jsx";
import { fetchCompanyBilling } from "../../services/billingService.js";
import { listEmployees } from "../../services/employeesService.js";
import { listDepartments, listJobTitles } from "../../services/catalogService.js";

function mapManagerOption(item) {
  const fullName = String(item?.full_name ?? "").trim();
  if (!fullName) return null;

  const department =
    item.department && item.department !== "—" ? item.department : "";
  const jobTitle =
    item.job_title_name && item.job_title_name !== "—" ? item.job_title_name : "";
  const suffix = [jobTitle, department].filter(Boolean).join(" · ");

  return {
    id: item.id,
    name: fullName,
    label: suffix ? `${fullName} — ${suffix}` : fullName,
  };
}

export default function AddEmployeeModalHost({ isOpen, onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [jobTitleOptions, setJobTitleOptions] = useState([]);
  const [subscriptionTier, setSubscriptionTier] = useState("trial");
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const loadModalData = useCallback(async () => {
    try {
      const [employeeRows, departments, jobTitles, billing] = await Promise.all([
        listEmployees(),
        listDepartments(),
        listJobTitles(),
        fetchCompanyBilling().catch(() => ({ subscription_tier: "trial" })),
      ]);
      setEmployees(employeeRows ?? []);
      setDepartmentOptions(departments ?? []);
      setJobTitleOptions(jobTitles ?? []);
      setSubscriptionTier(billing?.subscription_tier ?? "trial");
    } catch {
      setEmployees([]);
      setDepartmentOptions([]);
      setJobTitleOptions([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadModalData();
  }, [isOpen, loadModalData]);

  const managerOptions = useMemo(
    () => employees.map(mapManagerOption).filter(Boolean),
    [employees],
  );

  const handleCreated = async () => {
    await onCreated?.();
    await loadModalData();
  };

  return (
    <>
      <AddEmployeeSlideOver
        isOpen={isOpen}
        onClose={onClose}
        onOpenBulkImport={() => {
          onClose();
          setIsBulkImportOpen(true);
        }}
        departmentOptions={departmentOptions}
        jobTitleOptions={jobTitleOptions}
        managerOptions={managerOptions}
        employeeCount={employees.length}
        subscriptionTier={subscriptionTier}
        onCreated={handleCreated}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={async (result) => {
          setIsBulkImportOpen(false);
          await handleCreated();
        }}
      />
    </>
  );
}
