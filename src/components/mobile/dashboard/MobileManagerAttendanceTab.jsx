import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint, MapPin, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AttendancePunchButton from "../../attendance/mobile/AttendancePunchButton.jsx";
import AttendancePunchCamera from "../../attendance/mobile/AttendancePunchCamera.jsx";
import BiometricEnrollmentSection from "../../attendance/mobile/BiometricEnrollmentSection.jsx";
import AttendanceOperationsSection from "../../attendance/mobile/AttendanceOperationsSection.jsx";
import AttendanceMonthlyReportSection from "../../attendance/mobile/AttendanceMonthlyReportSection.jsx";
import {
  fetchEmployeeMonthlyAttendanceReport,
  fetchRecentAttendanceLogsForEmployee,
  fetchTodayAttendanceForEmployee,
} from "../../../services/attendanceService.js";
import {
  fetchEmployeeWorkBranchInfo,
  performAttendancePunch,
} from "../../../services/attendancePunchService.js";
import {
  isFaceEnrolled,
  saveLatestPunchSelfie,
} from "../../../services/faceEnrollmentService.js";
import { useCompanySettings } from "../../../context/CompanySettingsContext.jsx";
import {
  formatWorkTimeLabel,
  normalizeWorkTime,
} from "../../../utils/attendance/workHours.js";
import { canPunchOutForPeriod } from "../../../utils/attendance/workSchedules.js";
import { canManageAttendanceSettings } from "../../../utils/rbac.js";

function AdminAttendanceSettingsSection() {
  const { t } = useTranslation();

  if (!canManageAttendanceSettings()) return null;

  return (
    <section
      className="space-y-3 rounded-2xl border border-exeer-border bg-md-surface p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      aria-labelledby="mobile-attendance-admin-heading"
    >
      <div className="flex items-center gap-2">
        <Settings2
          className="h-4 w-4 text-exeer-primary dark:text-[var(--text-primary)]"
          aria-hidden
        />
        <h3
          id="mobile-attendance-admin-heading"
          className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
        >
          {t("pages.mobile.attendance.adminSettingsTitle")}
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
        {t("pages.mobile.attendance.adminSettingsHint")}
      </p>
      <Link
        to="/mobile/attendance/settings"
        className="flex items-center justify-between gap-3 rounded-xl border border-exeer-border bg-md-surface-dim px-4 py-3 transition-colors active:bg-exeer-hover dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:active:bg-[var(--bg-surface-hover)]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-start">
            <span className="block text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
              {t("nav.fingerprintSettings")}
            </span>
            <span className="mt-0.5 block text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
              {t("pages.mobile.attendance.geofenceBranches")}
            </span>
          </span>
        </span>
        <ChevronLeft
          className="h-5 w-5 shrink-0 text-exeer-muted dark:text-[var(--text-secondary)]"
          aria-hidden
        />
      </Link>
      <div className="flex items-start gap-2 rounded-xl border border-dashed border-exeer-border px-3 py-2.5 dark:border-[var(--border-color)]">
        <MapPin
          className="mt-0.5 h-4 w-4 shrink-0 text-exeer-muted dark:text-[var(--text-secondary)]"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
          {t("pages.mobile.attendance.geofenceNote")}
        </p>
      </div>
    </section>
  );
}

export default function MobileManagerAttendanceTab({ employeeId }) {
  const { t } = useTranslation();
  const { getSetting } = useCompanySettings();
  const [todayData, setTodayData] = useState(null);
  const [operationLogs, setOperationLogs] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isPunchCameraOpen, setIsPunchCameraOpen] = useState(false);
  const [punchBranchName, setPunchBranchName] = useState("—");
  const [isPunching, setIsPunching] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());
  const pendingSelfieRef = useRef(null);

  const activePeriod = todayData?.activePeriod ?? null;
  const fallbackEnd = normalizeWorkTime(getSetting("work_end_time"), "17:00");
  const workEndTime = activePeriod?.end ?? fallbackEnd;
  const workEndLabel = formatWorkTimeLabel(workEndTime);
  const scheduleHint = Array.isArray(todayData?.assignedPeriods)
    ? todayData.assignedPeriods
        .map((period) => `${period.name} (${period.start}–${period.end})`)
        .join(" · ")
    : "";

  const punchMode = useMemo(() => {
    if (todayData?.nextPunchType === "check_out") return "check_out";
    if (todayData?.nextPunchType === "complete") return "complete";
    return "check_in";
  }, [todayData?.nextPunchType]);

  const isCheckIn = punchMode === "check_in";
  const isCheckOut = punchMode === "check_out";
  const punchOutAllowed = canPunchOutForPeriod(activePeriod ?? { end: workEndTime });

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!employeeId) {
      setLoadError(t("pages.mobile.attendance.noEmployee"));
      setTodayData(null);
      setOperationLogs([]);
      setMonthlyReport(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const [today, logs, report] = await Promise.all([
        fetchTodayAttendanceForEmployee(employeeId, { getSetting }),
        fetchRecentAttendanceLogsForEmployee(employeeId),
        fetchEmployeeMonthlyAttendanceReport(employeeId),
      ]);
      setTodayData(today);
      setOperationLogs(logs);
      setMonthlyReport(report);
      setIsEnrolled(isFaceEnrolled(employeeId));
    } catch (err) {
      setLoadError(err.message || t("pages.mobile.attendance.loadError"));
      setTodayData(null);
      setOperationLogs([]);
      setMonthlyReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, getSetting, t]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const executePunch = async () => {
    setActionError("");
    setIsPunching(true);

    try {
      const selfieForPunch = pendingSelfieRef.current;
      const result = await performAttendancePunch(employeeId, selfieForPunch);
      pendingSelfieRef.current = null;

      if (selfieForPunch) {
        saveLatestPunchSelfie(employeeId, selfieForPunch, result.punchType);
      }
      setTodayData(result.summary);
      setSuccessMessage(
        result.punchType === "In"
          ? t("pages.mobile.attendance.punchInSuccess", {
              branch: result.branchName,
            })
          : t("pages.mobile.attendance.punchOutSuccess", {
              branch: result.branchName,
            }),
      );
      await loadAttendance();
    } catch (err) {
      setActionError(err.message || t("pages.mobile.attendance.punchError"));
    } finally {
      setIsPunching(false);
      setIsPunchCameraOpen(false);
    }
  };

  const handlePunchRequest = async () => {
    setActionError("");
    setSuccessMessage("");

    if (isCheckIn) {
      if (!isEnrolled) {
        setActionError(t("pages.mobile.attendance.enrollmentRequired"));
        return;
      }

      try {
        const branch = await fetchEmployeeWorkBranchInfo(employeeId);
        setPunchBranchName(branch.branchName);
        setIsPunchCameraOpen(true);
      } catch (err) {
        setActionError(err.message || t("pages.mobile.attendance.punchError"));
      }
      return;
    }

    if (isCheckOut) {
      if (!punchOutAllowed) return;
      await executePunch();
    }
  };

  const handlePunchSelfieCapture = async (selfieDataUrl) => {
    pendingSelfieRef.current = selfieDataUrl;
    saveLatestPunchSelfie(employeeId, selfieDataUrl, "In");
    await executePunch();
  };

  const punchLabel =
    todayData?.nextPunchLabel ??
    (isCheckOut
      ? t("pages.mobile.attendance.punchOut")
      : t("pages.mobile.attendance.punchIn"));

  const disabledHint = isCheckOut && !punchOutAllowed
    ? t("pages.mobile.attendance.punchOutLocked", { time: workEndLabel })
    : "";

  const canPunch =
    !isLoading &&
    !loadError &&
    !isPunching &&
    todayData?.canPunch !== false &&
    punchMode !== "complete" &&
    (isCheckIn ? isEnrolled : punchOutAllowed);

  void clockTick;

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {successMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      ) : null}

      <BiometricEnrollmentSection
        employeeId={employeeId}
        onEnrollmentChange={(value) => setIsEnrolled(value)}
      />

      {scheduleHint ? (
        <p className="rounded-2xl border border-exeer-border bg-md-surface px-4 py-3 text-xs leading-relaxed text-exeer-muted dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]">
          {t("pages.mobile.attendance.scheduleHint", { schedule: scheduleHint })}
        </p>
      ) : null}

      <section className="rounded-3xl border border-exeer-border bg-gradient-to-b from-white to-slate-50/80 px-5 py-6 shadow-sm dark:border-[var(--border-color)] dark:from-[var(--bg-surface)] dark:to-[var(--bg-main)]">
        <AttendancePunchButton
          label={punchLabel}
          onPunch={handlePunchRequest}
          disabled={!canPunch}
          isProcessing={isPunching && !isPunchCameraOpen}
          mode={punchMode}
          disabledHint={disabledHint}
        />
        {!isEnrolled && isCheckIn && !isLoading ? (
          <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
            {t("pages.mobile.attendance.enrollmentRequired")}
          </p>
        ) : null}
        {isCheckOut && !punchOutAllowed && !isLoading ? (
          <p className="mt-2 text-center text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
            {disabledHint}
          </p>
        ) : null}
      </section>

      <AttendanceOperationsSection logs={operationLogs} isLoading={isLoading} />

      <AttendanceMonthlyReportSection report={monthlyReport} isLoading={isLoading} />

      <AdminAttendanceSettingsSection />

      <AttendancePunchCamera
        isOpen={isPunchCameraOpen}
        branchName={punchBranchName}
        onCapture={handlePunchSelfieCapture}
        onClose={() => {
          if (!isPunching) setIsPunchCameraOpen(false);
        }}
        isProcessing={isPunching}
      />
    </div>
  );
}
