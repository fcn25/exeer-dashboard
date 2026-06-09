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
import { normalizeWorkTime } from "../../../utils/attendance/workHours.js";
import { canPunchOutForPeriod } from "../../../utils/attendance/workSchedules.js";
import { canManageAttendanceSettings } from "../../../utils/rbac.js";
import { supabase } from "../../../utils/supabaseClient.js";

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
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);

  const activePeriod = todayData?.activePeriod ?? null;
  const fallbackEnd = normalizeWorkTime(getSetting("work_end_time"), "17:00");
  const workEndTime = activePeriod?.end ?? fallbackEnd;
  const scheduleHint = Array.isArray(todayData?.assignedPeriods)
    ? todayData.assignedPeriods
        .map((period) => `${period.name} (${period.start}–${period.end})`)
        .join(" · ")
    : "";

  const punchOutAllowed = canPunchOutForPeriod(activePeriod ?? { end: workEndTime });

  const buttonState = useMemo(() => {
    if (!todayData || todayData.nextPunchType === "check_in") return "check_in";
    if (todayData.nextPunchType === "complete") return "done";
    if (todayData.nextPunchType === "check_out") {
      if (permissionStatus === "out") return "permission_out";
      return punchOutAllowed ? "check_out" : "locked";
    }
    return "check_in";
  }, [punchOutAllowed, permissionStatus, todayData]);

  const lockedUntil = useMemo(() => {
    if (buttonState !== "locked") return null;

    const endTime = activePeriod?.end ?? workEndTime;
    const [hours, minutes] = String(endTime).split(":").map(Number);
    if (!Number.isFinite(hours)) return null;

    const unlockAt = new Date();
    unlockAt.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    return unlockAt;
  }, [activePeriod?.end, buttonState, clockTick, workEndTime]);

  const isCheckIn = buttonState === "check_in";

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

      try {
        const { data: empData } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        const todayDate = new Date().toISOString().split("T")[0];
        const { data: perm } = await supabase
          .from("attendance_permissions")
          .select("status")
          .eq("employee_id", empData.id)
          .eq("permission_date", todayDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setPermissionStatus(perm?.status ?? null);
      } catch {
        setPermissionStatus(null);
      }
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

  const handleButtonPress = async () => {
    if (buttonState === "permission_out") {
      return;
    }

    if (buttonState !== "check_in" && buttonState !== "check_out") return;
    if (isLoading || loadError || isPunching) return;

    setActionError("");
    setSuccessMessage("");

    if (buttonState === "check_in" && !isEnrolled) {
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
  };

  const handlePunchSelfieCapture = async (selfieDataUrl) => {
    const punchType = buttonState === "check_out" ? "Out" : "In";
    pendingSelfieRef.current = selfieDataUrl;
    saveLatestPunchSelfie(employeeId, selfieDataUrl, punchType);
    await executePunch();
  };

  const handlePermissionOut = async () => {
    if (isPermissionLoading) return;
    setIsPermissionLoading(true);
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, company_id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const today = new Date().toISOString().split("T")[0];

      const { data: record } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("record_date", today)
        .single();

      await supabase.from("attendance_permissions").insert({
        company_id: emp.company_id,
        employee_id: emp.id,
        record_id: record?.id ?? null,
        permission_date: today,
        out_at: new Date().toISOString(),
        status: "out",
      });

      setPermissionStatus("out");
    } catch {
      setActionError("تعذّر تسجيل الاستئذان");
    } finally {
      setIsPermissionLoading(false);
    }
  };

  const handlePermissionReturn = async () => {
    if (isPermissionLoading) return;
    setIsPermissionLoading(true);
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const today = new Date().toISOString().split("T")[0];

      await supabase
        .from("attendance_permissions")
        .update({
          in_at: new Date().toISOString(),
          status: "returned",
        })
        .eq("employee_id", emp.id)
        .eq("permission_date", today)
        .eq("status", "out");

      setPermissionStatus("returned");
    } catch {
      setActionError("تعذّر تسجيل العودة");
    } finally {
      setIsPermissionLoading(false);
    }
  };

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

      <section className="rounded-3xl border border-exeer-border bg-gradient-to-b from-white to-slate-50/80 px-5 py-6 shadow-sm dark:border-[var(--border-color)] dark:from-[var(--bg-surface)] dark:to-[var(--bg-main)]">
        <AttendancePunchButton
          state={buttonState}
          onPress={handleButtonPress}
          lockedUntil={lockedUntil}
          isProcessing={isPunching}
        />
        {!isEnrolled && isCheckIn && !isLoading ? (
          <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
            {t("pages.mobile.attendance.enrollmentRequired")}
          </p>
        ) : null}
      </section>

      {buttonState === "locked" || buttonState === "check_out" ? (
        <div className="flex flex-col items-center gap-2 px-4">
          {permissionStatus === "out" ? (
            <button
              type="button"
              onClick={handlePermissionReturn}
              disabled={isPermissionLoading}
              className="w-full rounded-2xl border-2 border-amber-700/40 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-800 transition active:scale-[0.98] disabled:opacity-50 dark:border-amber-700/30 dark:bg-amber-950/30 dark:text-amber-300"
            >
              {isPermissionLoading
                ? "جارٍ التسجيل..."
                : "🔵 تسجيل العودة من الاستئذان"}
            </button>
          ) : permissionStatus === null || permissionStatus === "returned" ? (
            <button
              type="button"
              onClick={handlePermissionOut}
              disabled={isPermissionLoading}
              className="w-full rounded-2xl border border-exeer-border bg-white px-4 py-3.5 text-sm font-medium text-exeer-muted transition active:scale-[0.98] disabled:opacity-50 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]"
            >
              {isPermissionLoading ? "جارٍ التسجيل..." : "↗ طلب استئذان"}
            </button>
          ) : null}
        </div>
      ) : null}

      {scheduleHint ? (
        <p className="rounded-2xl border border-exeer-border bg-md-surface px-4 py-3 text-xs leading-relaxed text-exeer-muted dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]">
          {t("pages.mobile.attendance.scheduleHint", { schedule: scheduleHint })}
        </p>
      ) : null}

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
