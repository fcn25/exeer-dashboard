import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  ClipboardList,
  FileSpreadsheet,
  History,
  Lock,
  Printer,
  RefreshCw,
} from "lucide-react";
import PayrollChangeLogModal from "./components/payroll/PayrollChangeLogModal.jsx";
import PayrollChangeLogPanel from "./components/payroll/PayrollChangeLogPanel.jsx";
import PayrollEditableCell from "./components/payroll/PayrollEditableCell.jsx";
import PayrollTransitionConfirmDialog from "./components/payroll/PayrollTransitionConfirmDialog.jsx";
import PayrollUnsavedEditsDialog from "./components/payroll/PayrollUnsavedEditsDialog.jsx";
import PayrollHistoryModal from "./components/payroll/PayrollHistoryModal.jsx";
import { MonthInput } from "./components/ui/DateInput.jsx";
import {
  exportPayrollMonth,
  fetchPayrollChangeLogForRun,
  fetchPayrollForMonth,
  generatePayrollForMonth,
  saveAccountantPayrollRecordField,
  PAYROLL_RUN_EDIT_BLOCKED_MESSAGE,
  PAYROLL_RUN_LOCKED_MESSAGE,
  PAYROLL_RUN_STATUSES,
  PAYROLL_RUN_STATUS_LABELS,
  updatePayrollRunStatus,
} from "./services/payrollService.js";
import {
  fetchPayrollAccountingRows,
  syncPayrollDeductionsForMonth,
} from "./services/payrollSyncService.js";
import {
  computePayrollStats,
  formatPayrollMonthFromPicker,
} from "./utils/payroll/calculations.js";
import { downloadPayrollAccountingExcel } from "./utils/payroll/exportPayrollAccountingExcel.js";
import {
  ACCOUNTANT_EDITABLE_COLUMN_KEYS,
  buildPayrollDetailColumns,
  formatPayrollCurrency,
  PAYROLL_DEDUCTION_KEYS,
  PAYROLL_HEADER_TONE_CLASS,
  safePayrollAmount,
} from "./utils/payroll/payrollTableConfig.js";
import ExeerEmptyState from "./components/brand/ExeerEmptyState.jsx";
import { useCompanySettings } from "./context/CompanySettingsContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useAppLocale } from "./i18n/useAppLocale.js";
import { isAccountantRole, isHrPayrollStaff } from "./utils/rbac.js";

const CARD_CLASS =
  "rounded-md border border-gray-200 bg-white p-6 shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

function formatStatCount(value) {
  return safePayrollAmount(value);
}

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatLockedDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function formatSaveTimestamp(date) {
  if (!date) return "";
  try {
    return date.toLocaleString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function StatCard({ label, value }) {
  return (
    <article className={CARD_CLASS}>
      <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
    </article>
  );
}

export default function PayrollPage() {
  const { t } = useAppLocale();
  const { role } = useAuth();
  const isAccountant = isAccountantRole(role);
  const isHrPayroll = isHrPayrollStaff(role);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [rows, setRows] = useState([]);
  const [payrollRun, setPayrollRun] = useState(null);
  const [isExported, setIsExported] = useState(false);
  const [hasExistingPayroll, setHasExistingPayroll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [schemaWarning, setSchemaWarning] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);
  const [changeLogEntries, setChangeLogEntries] = useState([]);
  const [isChangeLogLoading, setIsChangeLogLoading] = useState(false);
  const [changeLogError, setChangeLogError] = useState("");
  const [savingCellKey, setSavingCellKey] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [failedCellKeys, setFailedCellKeys] = useState(() => new Set());
  const [pendingEdits, setPendingEdits] = useState(() => new Map());
  const [transitionConfirm, setTransitionConfirm] = useState(null);
  const [isTransitionSubmitting, setIsTransitionSubmitting] = useState(false);
  const [unsavedDialog, setUnsavedDialog] = useState(null);
  const [isUnsavedDialogSaving, setIsUnsavedDialogSaving] = useState(false);

  const { getSetting } = useCompanySettings();
  const showTransportColumn = Boolean(getSetting("transport_allowance_enabled"));
  const detailColumns = useMemo(
    () => buildPayrollDetailColumns({ showTransport: showTransportColumn }),
    [showTransportColumn],
  );

  const payrollMonthLabel = formatPayrollMonthFromPicker(selectedMonth);
  const stats = useMemo(() => computePayrollStats(rows), [rows]);
  const runStatus = payrollRun?.status ?? null;
  const isRunLocked = runStatus === PAYROLL_RUN_STATUSES.LOCKED;
  const isRunCancelled = runStatus === PAYROLL_RUN_STATUSES.CANCELLED;
  const isUnderReview = runStatus === PAYROLL_RUN_STATUSES.UNDER_REVIEW;
  const isPendingApproval = runStatus === PAYROLL_RUN_STATUSES.PENDING_APPROVAL;
  const isDraftRun = runStatus === PAYROLL_RUN_STATUSES.DRAFT;
  const isCreatableMonth =
    isHrPayroll &&
    !payrollRun &&
    !hasExistingPayroll &&
    !isRunLocked &&
    !isRunCancelled;
  const canHrGenerate =
    isCreatableMonth ||
    (isHrPayroll &&
      isDraftRun &&
      !hasExistingPayroll &&
      !isRunLocked &&
      !isRunCancelled);
  const canHrSync =
    isHrPayroll &&
    !isRunLocked &&
    !isRunCancelled &&
    (isDraftRun || isUnderReview);
  const canAccountantSync =
    isAccountant && isUnderReview && !isRunLocked && !isRunCancelled;
  const canAccountantEditInline = canAccountantSync;
  const hasUnsavedEdits = pendingEdits.size > 0;
  const isSavingAnyCell =
    Boolean(savingCellKey) || isUnsavedDialogSaving || saveStatus === "saving";
  const hasChangeLogEntries = changeLogEntries.length > 0;
  const statusBadgeLabel = runStatus
    ? (PAYROLL_RUN_STATUS_LABELS[runStatus] ?? null)
    : null;

  const loadPayroll = useCallback(async () => {
    if (!selectedMonth) return;

    setIsLoading(true);
    setError("");
    setSchemaWarning("");

    try {
      const result = await fetchPayrollForMonth(selectedMonth);
      setRows(result.rows);
      setPayrollRun(result.run ?? null);
      setIsExported(result.isExported);
      setHasExistingPayroll(result.hasRecords);
      setSchemaWarning(result.schemaWarning ?? "");
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || "تعذّر تحميل المسير.");
      setRows([]);
      setPayrollRun(null);
      setIsExported(false);
      setHasExistingPayroll(false);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const loadChangeLog = useCallback(async () => {
    if (!payrollRun?.id) {
      setChangeLogEntries([]);
      setChangeLogError("");
      return;
    }

    setIsChangeLogLoading(true);
    setChangeLogError("");

    try {
      const entries = await fetchPayrollChangeLogForRun(payrollRun.id);
      setChangeLogEntries(entries);
    } catch (err) {
      setChangeLogEntries([]);
      setChangeLogError(err.message || "تعذّر تحميل سجل التعديلات.");
    } finally {
      setIsChangeLogLoading(false);
    }
  }, [payrollRun?.id]);

  useEffect(() => {
    loadChangeLog();
  }, [loadChangeLog]);

  const showLockedToast = useCallback(() => {
    setSuccessMessage("");
    setError(PAYROLL_RUN_LOCKED_MESSAGE);
  }, []);

  const showEditBlockedToast = useCallback(() => {
    setSuccessMessage("");
    setError(PAYROLL_RUN_EDIT_BLOCKED_MESSAGE);
  }, []);

  const handleCellSave = useCallback(
    async (row, columnKey, nextValue) => {
      if (!canAccountantEditInline) {
        showEditBlockedToast();
        return false;
      }

      const cellKey = `${row.id}:${columnKey}`;
      setSavingCellKey(cellKey);
      setSaveStatus("saving");
      setError("");

      try {
        const updatedRow = await saveAccountantPayrollRecordField({
          pickerValue: selectedMonth,
          recordId: row.id,
          fieldKey: columnKey,
          value: nextValue,
        });

        setRows((current) =>
          current.map((item) => (item.id === row.id ? updatedRow : item)),
        );
        setPendingEdits((current) => {
          const next = new Map(current);
          next.delete(cellKey);
          return next;
        });
        setFailedCellKeys((current) => {
          const next = new Set(current);
          next.delete(cellKey);
          return next;
        });
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        await loadChangeLog();
        return true;
      } catch (err) {
        setFailedCellKeys((current) => new Set(current).add(cellKey));
        setSaveStatus("error");
        setError(err.message || "تعذّر حفظ التعديل.");
        return false;
      } finally {
        setSavingCellKey("");
      }
    },
    [
      canAccountantEditInline,
      loadChangeLog,
      selectedMonth,
      showEditBlockedToast,
    ],
  );

  const saveAllPendingEdits = useCallback(async () => {
    const edits = Array.from(pendingEdits.values());
    if (edits.length === 0) return true;

    let allSaved = true;
    for (const edit of edits) {
      const saved = await handleCellSave(edit.row, edit.columnKey, edit.value);
      if (!saved) allSaved = false;
    }
    return allSaved;
  }, [handleCellSave, pendingEdits]);

  const openTransitionConfirm = useCallback((config) => {
    setTransitionConfirm(config);
  }, []);

  const closeTransitionConfirm = useCallback(() => {
    if (!isTransitionSubmitting) {
      setTransitionConfirm(null);
    }
  }, [isTransitionSubmitting]);

  const runTransitionConfirm = useCallback(async () => {
    if (!transitionConfirm?.execute) return;

    setIsTransitionSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await transitionConfirm.execute();
      setTransitionConfirm(null);
    } catch (err) {
      setError(err.message || "تعذّر تنفيذ الإجراء.");
    } finally {
      setIsTransitionSubmitting(false);
    }
  }, [transitionConfirm]);

  const handleMonthChange = useCallback(
    (nextMonth) => {
      if (!nextMonth || nextMonth === selectedMonth) return;
      if (hasUnsavedEdits || savingCellKey) {
        setUnsavedDialog({ type: "month", targetMonth: nextMonth });
        return;
      }
      setSelectedMonth(nextMonth);
    },
    [hasUnsavedEdits, savingCellKey, selectedMonth],
  );

  const closeUnsavedDialog = useCallback(() => {
    if (isUnsavedDialogSaving) return;
    if (unsavedDialog?.type === "navigation") {
      unsavedDialog.reset?.();
    }
    setUnsavedDialog(null);
  }, [isUnsavedDialogSaving, unsavedDialog]);

  const continueAfterUnsavedDialog = useCallback(() => {
    const dialog = unsavedDialog;
    setUnsavedDialog(null);

    if (dialog?.type === "month" && dialog.targetMonth) {
      setPendingEdits(new Map());
      setFailedCellKeys(new Set());
      setSaveStatus("idle");
      setSelectedMonth(dialog.targetMonth);
      return;
    }

    if (dialog?.type === "navigation") {
      dialog.proceed?.();
    }
  }, [unsavedDialog]);

  const handleUnsavedSaveAndContinue = useCallback(async () => {
    setIsUnsavedDialogSaving(true);
    try {
      const saved = await saveAllPendingEdits();
      if (!saved) return;
      continueAfterUnsavedDialog();
    } finally {
      setIsUnsavedDialogSaving(false);
    }
  }, [continueAfterUnsavedDialog, saveAllPendingEdits]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedEdits &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked" || unsavedDialog) return;
    setUnsavedDialog({
      type: "navigation",
      proceed: () => blocker.proceed?.(),
      reset: () => blocker.reset?.(),
    });
  }, [blocker, unsavedDialog]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedEdits) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedEdits]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const applyPayrollResult = useCallback((result) => {
    setRows(result.rows);
    setPayrollRun(result.run ?? null);
    setIsExported(result.isExported);
    setHasExistingPayroll(result.hasRecords);
    setSchemaWarning(result.schemaWarning ?? "");
    setHasLoaded(true);
  }, []);

  const handleGeneratePayroll = async () => {
    if (!selectedMonth || hasExistingPayroll || !isHrPayroll) return;
    if (isRunLocked) {
      showLockedToast();
      return;
    }
    if (!canHrGenerate) {
      showEditBlockedToast();
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await generatePayrollForMonth(selectedMonth);
      applyPayrollResult(result);
      setSuccessMessage("تم إنشاء مسير الشهر بنجاح");
    } catch (err) {
      setError(err.message || "تعذّر إنشاء المسير.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncDeductions = async () => {
    if (!selectedMonth || rows.length === 0) return;
    if (isRunLocked) {
      showLockedToast();
      return;
    }
    if (isAccountant && !canAccountantSync) {
      showEditBlockedToast();
      return;
    }
    if (isHrPayroll && !canHrSync) {
      showEditBlockedToast();
      return;
    }
    if (!isAccountant && !isHrPayroll) {
      showEditBlockedToast();
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await syncPayrollDeductionsForMonth(selectedMonth);
      await loadPayroll();
      const addedNote =
        result.addedCount > 0
          ? ` — أُضيف ${result.addedCount} موظف للمسير`
          : "";
      setSuccessMessage(
        `تم تحديث الرواتب والبدلات والخصومات لشهر ${result.payrollMonth} — ${result.updatedCount} موظف${addedNote}`,
      );
    } catch (err) {
      setError(err.message || "تعذّر تحديث أرقام المسير.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeSubmitForReview = useCallback(async () => {
    if (!selectedMonth || !hasExistingPayroll || !isHrPayroll || isRunLocked) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePayrollRunStatus(
        selectedMonth,
        PAYROLL_RUN_STATUSES.UNDER_REVIEW,
      );
      applyPayrollResult(result);
      setSuccessMessage("تم إرسال المسير للمراجعة");
    } catch (err) {
      setError(err.message || "تعذّر إرسال المسير للمراجعة.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyPayrollResult,
    hasExistingPayroll,
    isHrPayroll,
    isRunLocked,
    selectedMonth,
  ]);

  const requestSubmitForReview = useCallback(() => {
    openTransitionConfirm({
      variant: "simple",
      title: "إرسال للمراجعة",
      message: "سيتم إرسال المسير للمحاسب للمراجعة. متابعة؟",
      execute: executeSubmitForReview,
    });
  }, [executeSubmitForReview, openTransitionConfirm]);

  const executeSubmitToHr = useCallback(async () => {
    if (
      !selectedMonth ||
      !hasExistingPayroll ||
      !isAccountant ||
      !isUnderReview
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePayrollRunStatus(
        selectedMonth,
        PAYROLL_RUN_STATUSES.PENDING_APPROVAL,
      );
      applyPayrollResult(result);
      setSuccessMessage("تم إرسال المسير للموارد البشرية");
    } catch (err) {
      setError(err.message || "تعذّر إرسال المسير للموارد البشرية.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyPayrollResult,
    hasExistingPayroll,
    isAccountant,
    isUnderReview,
    selectedMonth,
  ]);

  const requestSubmitToHr = useCallback(() => {
    openTransitionConfirm({
      variant: "simple",
      title: "إرسال للموارد البشرية",
      message:
        "هل أكملت جميع تعديلاتك؟ سيُرسل المسير للموارد البشرية للاعتماد. متابعة؟",
      execute: executeSubmitToHr,
    });
  }, [executeSubmitToHr, openTransitionConfirm]);

  const executeReturnToDraft = useCallback(async () => {
    if (!selectedMonth || isRunLocked || !isHrPayroll) return;

    setIsLoading(true);
    try {
      const result = await updatePayrollRunStatus(
        selectedMonth,
        PAYROLL_RUN_STATUSES.DRAFT,
      );
      applyPayrollResult(result);
      setSuccessMessage("تم إرجاع المسير كمسودة");
    } catch (err) {
      setError(err.message || "تعذّر إرجاع المسير كمسودة.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [applyPayrollResult, isHrPayroll, isRunLocked, selectedMonth]);

  const requestReturnToDraft = useCallback(() => {
    openTransitionConfirm({
      variant: "simple",
      title: "إرجاع كمسودة",
      message: "سيُعاد المسير إلى مسودة. متابعة؟",
      execute: executeReturnToDraft,
    });
  }, [executeReturnToDraft, openTransitionConfirm]);

  const executeReturnToAccountant = useCallback(async () => {
    if (!selectedMonth || isRunLocked || !isHrPayroll || !isPendingApproval) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePayrollRunStatus(
        selectedMonth,
        PAYROLL_RUN_STATUSES.UNDER_REVIEW,
      );
      applyPayrollResult(result);
      setSuccessMessage("تم إعادة المسير للمحاسب");
    } catch (err) {
      setError(err.message || "تعذّر إعادة المسير للمحاسب.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyPayrollResult,
    isHrPayroll,
    isPendingApproval,
    isRunLocked,
    selectedMonth,
  ]);

  const requestReturnToAccountant = useCallback(() => {
    openTransitionConfirm({
      variant: "simple",
      title: "إعادة للمحاسب",
      message: "سيُعاد المسير للمحاسب للتعديل. متابعة؟",
      execute: executeReturnToAccountant,
    });
  }, [executeReturnToAccountant, openTransitionConfirm]);

  const executeLockRun = useCallback(async () => {
    if (!selectedMonth || isRunLocked || !isHrPayroll || !isPendingApproval) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePayrollRunStatus(
        selectedMonth,
        PAYROLL_RUN_STATUSES.LOCKED,
      );
      applyPayrollResult(result);
      setSuccessMessage("تم اعتماد وقفل المسير");
    } catch (err) {
      setError(err.message || "تعذّر قفل المسير.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyPayrollResult,
    isHrPayroll,
    isPendingApproval,
    isRunLocked,
    selectedMonth,
  ]);

  const requestLockRun = useCallback(() => {
    openTransitionConfirm({
      variant: "lock",
      title: "اعتماد وقفل المسير",
      message:
        "سيتم اعتماد المسير وقفله نهائياً. لن تتمكن من تعديل الأرقام أو إرجاع المسير بعد ذلك.",
      execute: executeLockRun,
    });
  }, [executeLockRun, openTransitionConfirm]);

  const handleExportAccounting = async () => {
    if (!selectedMonth || rows.length === 0) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const records = await fetchPayrollAccountingRows(selectedMonth);
      downloadPayrollAccountingExcel(records, payrollMonthLabel);
      if (!isRunLocked) {
        await exportPayrollMonth(selectedMonth);
        await loadPayroll();
        setSuccessMessage(
          "تم تصدير ملف المحاسبة وتحديث حالة المسير إلى exported",
        );
      } else {
        setSuccessMessage("تم تصدير ملف المحاسبة");
      }
    } catch (err) {
      setError(err.message || "تعذّر تصدير ملف المحاسبة.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-payroll");

    const cleanup = () => {
      document.body.classList.remove("printing-payroll");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const statsReady = hasLoaded && !isLoading;

  return (
    <div className="md-page payroll-page">
      <header className="payroll-no-print space-y-2">
        <h1 className="md-page-title">{t("pages.payroll.title")}</h1>
        <p className="text-sm text-slate-500">{t("pages.payroll.subtitle")}</p>
      </header>

      <div className="payroll-no-print space-y-4">
        {statusBadgeLabel && !isRunLocked ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm font-medium shadow-none ${
              isPendingApproval
                ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                : isUnderReview
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {statusBadgeLabel}
          </div>
        ) : null}

        {isRunLocked ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-none">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            <span>{PAYROLL_RUN_STATUS_LABELS[PAYROLL_RUN_STATUSES.LOCKED]}</span>
            {payrollRun?.lockedAt ? (
              <span className="text-emerald-800/80">
                — {formatLockedDate(payrollRun.lockedAt)}
              </span>
            ) : null}
          </div>
        ) : null}

        {isAccountant && !isUnderReview && !isRunLocked && runStatus ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-none">
            {isPendingApproval
              ? PAYROLL_RUN_STATUS_LABELS[PAYROLL_RUN_STATUSES.PENDING_APPROVAL]
              : isDraftRun
                ? "مسودة — بانتظار إرسال الموارد البشرية للمحاسب"
                : statusBadgeLabel ?? "عرض للقراءة فقط"}
          </div>
        ) : null}

        {isExported && !isRunLocked ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-none">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            {t("pages.payroll.exportedNote", { month: payrollMonthLabel })}
          </div>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800 shadow-none">
            {successMessage}
          </p>
        ) : null}

        {schemaWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-none">
            {schemaWarning}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-none">
            {error}
          </p>
        ) : null}

        <section
          className={`${CARD_CLASS} flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <MonthInput
              id="payroll-month"
              label={t("pages.payroll.selectMonth")}
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={isLoading}
              className="min-w-[220px]"
            />

            {isHrPayroll && canHrGenerate ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleGeneratePayroll}
                  disabled={isLoading || !selectedMonth || hasExistingPayroll}
                  className="md-btn-primary shadow-none"
                >
                  {isLoading
                    ? t("common.loading")
                    : t("pages.payroll.generate")}
                </button>
                {hasExistingPayroll ? (
                  <p className="text-xs text-slate-500">
                    تم إنشاء مسير هذا الشهر
                  </p>
                ) : null}
              </div>
            ) : null}

            {isHrPayroll && canHrSync ? (
              <button
                type="button"
                onClick={handleSyncDeductions}
                disabled={isLoading || !selectedMonth || rows.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
                title="مزامنة التأخيرات والجزاءات والقروض للشهر المعروض"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t("pages.payroll.sync")}
              </button>
            ) : null}

            {isAccountant && canAccountantSync ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncDeductions}
                  disabled={isLoading || !selectedMonth || rows.length === 0}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
                  title="مزامنة التأخيرات والجزاءات والقروض للشهر المعروض"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {t("pages.payroll.sync")}
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={requestSubmitToHr}
                    disabled={
                      isLoading ||
                      isSavingAnyCell ||
                      !selectedMonth ||
                      rows.length === 0
                    }
                    className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-900 shadow-none hover:bg-indigo-100 disabled:opacity-50"
                  >
                    إرسال للموارد البشرية
                  </button>
                  <p className="max-w-xs text-xs text-indigo-700">
                    التعديلات تُحفظ تلقائياً عند الخروج من كل حقل. الإرسال
                    للموارد البشرية يغيّر الحالة فقط ولا يحفظ التعديلات.
                  </p>
                </div>
              </>
            ) : null}

            {isHrPayroll &&
            isDraftRun &&
            hasExistingPayroll &&
            !isRunLocked &&
            !isRunCancelled ? (
              <button
                type="button"
                onClick={requestSubmitForReview}
                disabled={isLoading || !selectedMonth}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-900 shadow-none hover:bg-indigo-100 disabled:opacity-50"
              >
                إرسال للمراجعة
              </button>
            ) : null}

            {isHrPayroll && isUnderReview ? (
              <button
                type="button"
                onClick={requestReturnToDraft}
                disabled={isLoading || !selectedMonth}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
              >
                إرجاع كمسودة
              </button>
            ) : null}

            {isHrPayroll && isPendingApproval ? (
              <>
                <button
                  type="button"
                  onClick={requestReturnToDraft}
                  disabled={isLoading || !selectedMonth}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
                >
                  إرجاع كمسودة
                </button>
                <button
                  type="button"
                  onClick={requestReturnToAccountant}
                  disabled={isLoading || !selectedMonth}
                  className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 shadow-none hover:bg-amber-100 disabled:opacity-50"
                >
                  إعادة للمحاسب
                </button>
                <button
                  type="button"
                  onClick={requestLockRun}
                  disabled={isLoading || !selectedMonth}
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-none hover:bg-emerald-800 disabled:opacity-50"
                >
                  اعتماد وقفل المسير
                </button>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {isHrPayroll && hasChangeLogEntries ? (
              <button
                type="button"
                onClick={() => setIsChangeLogOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-900 shadow-none hover:bg-indigo-100"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                سجل التعديلات
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50"
            >
              <History className="h-4 w-4" aria-hidden />
              {t("pages.payroll.history")}
            </button>
            <button
              type="button"
              onClick={handleExportAccounting}
              disabled={isLoading || !selectedMonth || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-none hover:bg-slate-800 disabled:opacity-50"
              title="تصدير Excel للمحاسبة (يشمل البنك والآيبان — غير معروض في الجدول)"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              {t("pages.payroll.exportAccounting")}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-none hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden />
              {t("pages.payroll.print")}
            </button>
          </div>
        </section>
      </div>

      <div id="payroll-print-area" className="space-y-6">
        {isHrPayroll && isPendingApproval ? (
          <div className="payroll-no-print">
            <PayrollChangeLogPanel
              entries={changeLogEntries}
              isLoading={isChangeLogLoading}
              error={changeLogError}
            />
          </div>
        ) : null}

        {canAccountantEditInline ? (
          <div className="payroll-no-print space-y-2">
            <p className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 shadow-none">
              يمكنك تعديل السكن والبدلات والعمولات والإضافي والجزاءات مباشرة —
              يُحفظ كل حقل تلقائياً عند الخروج منه ويُعاد احتساب GOSI والصافي.
              «إرسال للموارد البشرية» خطوة منفصلة لتغيير الحالة فقط.
            </p>
            <div
              className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-none"
              aria-live="polite"
            >
              {isSavingAnyCell ? (
                <span className="font-medium text-indigo-700">جارٍ الحفظ...</span>
              ) : saveStatus === "saved" && lastSavedAt ? (
                <span className="font-medium text-emerald-700">
                  تم الحفظ ✓ — {formatSaveTimestamp(lastSavedAt)}
                </span>
              ) : saveStatus === "error" ? (
                <span className="font-medium text-red-700">لم يتم الحفظ</span>
              ) : (
                <span className="text-slate-500">
                  التعديلات تُحفظ تلقائياً عند الخروج من الحقل
                </span>
              )}
              {hasUnsavedEdits ? (
                <span className="text-xs text-amber-700">
                  ({pendingEdits.size} حقل غير محفوظ)
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <section
          className="payroll-no-print grid grid-cols-1 gap-5 sm:grid-cols-3"
          aria-label="ملخص المسير"
        >
          <StatCard
            label={t("pages.payroll.employees")}
            value={statsReady ? formatStatCount(stats.employeeCount) : "—"}
          />
          <StatCard
            label={t("pages.payroll.totalDeductions")}
            value={
              statsReady ? formatPayrollCurrency(stats.totalDeductions) : "—"
            }
          />
          <StatCard
            label={t("pages.payroll.totalNet")}
            value={statsReady ? formatPayrollCurrency(stats.totalNet) : "—"}
          />
        </section>

        <section className={`${CARD_CLASS} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="payroll-table w-full min-w-[1100px] border-collapse text-sm shadow-none">
              <thead>
                <tr>
                  {detailColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold shadow-none ${PAYROLL_HEADER_TONE_CLASS[column.tone]}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={detailColumns.length}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                ) : !hasLoaded || rows.length === 0 ? (
                  <tr>
                    <td colSpan={detailColumns.length} className="p-0">
                      <ExeerEmptyState
                        message={
                          hasLoaded
                            ? t("pages.payroll.emptyTitle")
                            : t("pages.payroll.emptyBody")
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-200 hover:bg-gray-50/80"
                    >
                      {detailColumns.map((column) => {
                        const isEditable =
                          canAccountantEditInline &&
                          ACCOUNTANT_EDITABLE_COLUMN_KEYS.has(column.key) &&
                          (column.key !== "transport" || showTransportColumn);
                        const cellKey = `${row.id}:${column.key}`;
                        const isSavingCell = savingCellKey === cellKey;

                        return (
                          <td
                            key={column.key}
                            className={`px-4 py-3 text-center tabular-nums ${
                              PAYROLL_DEDUCTION_KEYS.has(column.key)
                                ? "font-medium text-red-700"
                                : "text-slate-800"
                            }`}
                          >
                            {column.key === "employeeName" ? (
                              row.employeeName
                            ) : isEditable ? (
                              <PayrollEditableCell
                                value={row[column.key]}
                                isSaving={isSavingCell}
                                saveFailed={failedCellKeys.has(cellKey)}
                                onDirtyChange={(isDirty, draftValue) => {
                                  setPendingEdits((current) => {
                                    const next = new Map(current);
                                    if (isDirty) {
                                      next.set(cellKey, {
                                        row,
                                        columnKey: column.key,
                                        value: draftValue,
                                      });
                                    } else {
                                      next.delete(cellKey);
                                    }
                                    return next;
                                  });
                                }}
                                onSave={async (nextValue) =>
                                  handleCellSave(row, column.key, nextValue)
                                }
                              />
                            ) : (
                              formatPayrollCurrency(row[column.key])
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PayrollHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <PayrollChangeLogModal
        isOpen={isChangeLogOpen}
        onClose={() => setIsChangeLogOpen(false)}
        entries={changeLogEntries}
        isLoading={isChangeLogLoading}
        error={changeLogError}
      />

      <PayrollTransitionConfirmDialog
        isOpen={Boolean(transitionConfirm)}
        variant={transitionConfirm?.variant ?? "simple"}
        title={transitionConfirm?.title ?? ""}
        message={transitionConfirm?.message ?? ""}
        isSubmitting={isTransitionSubmitting || isLoading}
        onConfirm={runTransitionConfirm}
        onClose={closeTransitionConfirm}
      />

      <PayrollUnsavedEditsDialog
        isOpen={Boolean(unsavedDialog)}
        isSaving={isUnsavedDialogSaving}
        onSaveAndContinue={handleUnsavedSaveAndContinue}
        onDiscardAndContinue={continueAfterUnsavedDialog}
        onCancel={closeUnsavedDialog}
      />

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body:not(.printing-payroll) * {
            visibility: hidden;
          }
          .payroll-table,
          .payroll-table * {
            visibility: visible;
          }
          .payroll-table {
            position: absolute;
            right: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
