import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint, MapPin, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AttendancePunchButton from "../../attendance/mobile/AttendancePunchButton.jsx";
import AttendanceTodaySummary from "../../attendance/mobile/AttendanceTodaySummary.jsx";
import AttendanceHistorySection from "../../attendance/mobile/AttendanceHistorySection.jsx";
import {
  fetchRecentAttendanceHistory,
  fetchTodayAttendanceForEmployee,
} from "../../../services/attendanceService.js";
import { performAttendancePunch } from "../../../services/attendancePunchService.js";
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
  const [todayData, setTodayData] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAttendance = useCallback(async () => {
    if (!employeeId) {
      setLoadError("لم يتم ربط حسابك بسجل موظف. تواصل مع الموارد البشرية.");
      setTodayData(null);
      setHistoryRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const [today, history] = await Promise.all([
        fetchTodayAttendanceForEmployee(employeeId),
        fetchRecentAttendanceHistory(employeeId),
      ]);
      setTodayData(today);
      setHistoryRecords(history);
    } catch (err) {
      setLoadError(err.message || "تعذّر تحميل بيانات الحضور.");
      setTodayData(null);
      setHistoryRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handlePunch = async () => {
    setActionError("");
    try {
      const result = await performAttendancePunch(employeeId);
      setTodayData(result.summary);
      setSuccessMessage(
        result.punchType === "In"
          ? `تم تسجيل الحضور — ${result.branchName}`
          : `تم تسجيل الانصراف — ${result.branchName}`,
      );
      await loadAttendance();
    } catch (err) {
      setActionError(err.message || "تعذّر إتمام التسجيل.");
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

      <AttendanceTodaySummary attendance={todayData} isLoading={isLoading} />
      <div className="flex justify-center py-2">
        <AttendancePunchButton
          attendance={todayData}
          isLoading={isLoading}
          onPunch={handlePunch}
        />
      </div>
      <AttendanceHistorySection records={historyRecords} isLoading={isLoading} />
      <AdminAttendanceSettingsSection />
    </div>
  );
}
