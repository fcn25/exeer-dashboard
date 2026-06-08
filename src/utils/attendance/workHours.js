import { formatAttendanceClockTime } from "./summary.js";

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function normalizeWorkTime(value, fallback = "08:00") {
  const text = String(value ?? fallback).trim();
  if (TIME_PATTERN.test(text)) return text;
  return fallback;
}

export function workTimeToMinutes(timeValue) {
  const normalized = normalizeWorkTime(timeValue, "00:00");
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentLocalMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function canPunchOutNow(workEndTime) {
  return getCurrentLocalMinutes() >= workTimeToMinutes(workEndTime);
}

export function formatWorkTimeLabel(timeValue) {
  const normalized = normalizeWorkTime(timeValue);
  return formatAttendanceClockTime(`${normalized}:00`) ?? normalized;
}
