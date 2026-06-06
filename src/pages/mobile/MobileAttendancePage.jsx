import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import AttendancePunchButton from "../../components/attendance/mobile/AttendancePunchButton.jsx";
import AttendanceTodaySummary from "../../components/attendance/mobile/AttendanceTodaySummary.jsx";
import AttendanceHistorySection from "../../components/attendance/mobile/AttendanceHistorySection.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import {
  MOCK_TODAY_ATTENDANCE,
  MOCK_MONTHLY_RECORDS,
} from "../../components/attendance/mobile/attendanceMockData.js";

function formatNowTime() {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

export default function MobileAttendancePage() {
  const { i18n } = useTranslation();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [todayData, setTodayData] = useState(MOCK_TODAY_ATTENDANCE);
  const [successToast, setSuccessToast] = useState("");

  const handlePunch = () => {
    const isCheckIn = todayData.nextPunchType === "check_in";
    const nextType = isCheckIn ? "check_out" : "check_in";

    setTodayData((current) => ({
      ...current,
      lastPunch: {
        time: formatNowTime(),
        type: current.nextPunchType,
        typeLabel: current.nextPunchLabel,
      },
      nextPunchType: nextType,
      nextPunchLabel: nextType === "check_in" ? "تسجيل حضور" : "تسجيل انصراف",
      workingMinutes: isCheckIn
        ? current.workingMinutes
        : current.workingMinutes + 15,
    }));

    setSuccessToast(
      isCheckIn
        ? "تم تسجيل الحضور بنجاح (بيانات تجريبية)"
        : "تم تسجيل الانصراف بنجاح (بيانات تجريبية)",
    );
  };

  const handlePermissionRequest = () => {
    setSuccessToast("سيتم فتح نموذج الاستئذان قريباً (واجهة تجريبية)");
  };

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
        <section className="rounded-3xl border border-exeer-border bg-gradient-to-b from-white to-slate-50/80 px-5 py-8 shadow-sm dark:from-slate-900 dark:to-slate-800/60">
          <AttendancePunchButton
            label={todayData.nextPunchLabel}
            onPunch={handlePunch}
          />
        </section>

        <AttendanceTodaySummary data={todayData} />

        <button
          type="button"
          onClick={handlePermissionRequest}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-exeer-border bg-white px-4 py-3.5 text-sm font-semibold text-exeer-primary shadow-sm transition-colors hover:bg-exeer-hover active:scale-[0.99] dark:bg-md-surface"
        >
          <CalendarClock className="h-4 w-4 stroke-[1.75]" aria-hidden />
          استئذان
        </button>

        <AttendanceHistorySection records={MOCK_MONTHLY_RECORDS} />
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
