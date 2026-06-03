import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  isPast,
} from "date-fns";

export function getTrialCountdown(trialEndsAt) {
  if (!trialEndsAt) {
    return {
      expired: false,
      days: 14,
      hours: 0,
      minutes: 0,
      label: "14 يوماً",
      percentRemaining: 100,
    };
  }

  const end = new Date(trialEndsAt);
  const now = new Date();

  if (isPast(end)) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      label: "انتهت الفترة التجريبية",
      percentRemaining: 0,
    };
  }

  const days = differenceInCalendarDays(end, now);
  const hours = differenceInHours(end, now) % 24;
  const minutes = differenceInMinutes(end, now) % 60;

  const totalMinutes = Math.max(
    differenceInMinutes(end, now),
    1,
  );
  const fullTrialMinutes = 14 * 24 * 60;
  const percentRemaining = Math.min(
    100,
    Math.round((totalMinutes / fullTrialMinutes) * 100),
  );

  const parts = [];
  if (days > 0) parts.push(`${days} يوم`);
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} دقيقة`);

  return {
    expired: false,
    days,
    hours,
    minutes,
    label: parts.join(" و ") || "أقل من دقيقة",
    percentRemaining,
  };
}
