import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import AttendancePunchButton from "../../components/attendance/mobile/AttendancePunchButton.jsx";
import AttendanceTodaySummary from "../../components/attendance/mobile/AttendanceTodaySummary.jsx";
import AttendanceHistorySection from "../../components/attendance/mobile/AttendanceHistorySection.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import ErrorToast from "../../components/ui/ErrorToast.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  fetchRecentAttendanceHistory,
  fetchTodayAttendanceForEmployee,
} from "../../services/attendanceService.js";
import { performAttendancePunch } from "../../services/attendancePunchService.js";

export default function MobileAttendancePage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const employeeId = user?.employee_id;
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [todayData, setTodayData] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

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
    setErrorToast("");

    try {
      const result = await performAttendancePunch(employeeId);
      setTodayData(result.summary);
      setSuccessToast(
        result.punchType === "In"
          ? `تم تسجيل الحضور بنجاح — ${result.branchName}`
          : `تم تسجيل الانصراف بنجاح — ${result.branchName}`,
      );
      await loadAttendance();
    } catch (err) {
      setErrorToast(err.message || "تعذّر إتمام التسجيل.");
    }
  };

  const handlePermissionRequest = () => {
    setSuccessToast("سيتم فتح نموذج الاستئذان قريباً");
  };

  const punchLabel = todayData?.nextPunchLabel ?? "تسجيل حضور";
  const canPunch = todayData?.canPunch !== false && !isLoading && !loadError;

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-md-surface-dim font-sans text-exeer-primary"
    >
      <header className="sticky top-0 z-40 border-b border-exeer-border bg-md-surface/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-exeer-border bg-white text-exeer-primary shadow-sm transition-colors hover:bg-exeer-hover dark:bg-slate-900"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">الحضور والبصمة</h1>
            <p className="text-xs text-exeer-muted">تسجيل الدخول والخروج اليومي</p>
          </div>
        </div>
      </header>

      <main className="space-y-5 px-4 py-6 pb-10">
        {loadError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </p>
        ) : null}

        <section className="rounded-3xl border border-exeer-border bg-gradient-to-b from-white to-slate-50/80 px-5 py-8 shadow-sm dark:from-slate-900 dark:to-slate-800/60">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-36 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <p className="text-sm text-exeer-muted">جاري التحميل...</p>
            </div>
          ) : (
            <AttendancePunchButton
              label={punchLabel}
              onPunch={handlePunch}
              disabled={!canPunch}
            />
          )}
        </section>

        {todayData ? <AttendanceTodaySummary data={todayData} /> : null}

        <button
          type="button"
          onClick={handlePermissionRequest}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-exeer-border bg-white px-4 py-3.5 text-sm font-semibold text-exeer-primary shadow-sm transition-colors hover:bg-exeer-hover active:scale-[0.99] dark:bg-md-surface"
        >
          <CalendarClock className="h-4 w-4 stroke-[1.75]" aria-hidden />
          استئذان
        </button>

        <AttendanceHistorySection
          records={historyRecords}
          isLoading={isLoading}
        />
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
