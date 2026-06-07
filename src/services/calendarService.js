import i18n from "../i18n/index.js";
import {
  DEFAULT_APPOINTMENT_TYPE,
  isValidUserAppointmentType,
  resolveAppointmentTypeMeta,
  USER_APPOINTMENT_TYPES,
} from "../constants/appointmentTypes.js";
import { getSaudiPublicHolidaysInRange } from "../constants/saudiPublicHolidays.js";
import { supabase } from "../utils/supabaseClient.js";
import { getAuthUserId, getCompanyId } from "../utils/mobileAuth.js";
import { eventDateFromTimestamp, getMonthRange, isDateInRange } from "../utils/calendarDates.js";

export const CALENDAR_LEGEND_TYPES = {
  holiday: resolveAppointmentTypeMeta("holiday"),
  event: resolveAppointmentTypeMeta("event"),
  ...USER_APPOINTMENT_TYPES,
};

const SORT_ORDER = [
  "holiday",
  "event",
  "meeting",
  "interview",
  "leave",
  "review",
  "training",
];

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول التقويم غير جاهز. نفّذ migration calendar_appointments في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function requireAuthUserId() {
  const userId = getAuthUserId();
  if (!userId) {
    throw new Error("يجب تسجيل الدخول لحفظ المواعيد الشخصية.");
  }
  return userId;
}

function currentLang() {
  return i18n.language?.startsWith("en") ? "en" : "ar";
}

function pushEntry(map, entry) {
  if (!entry?.date) return;
  const list = map.get(entry.date) ?? [];
  list.push(entry);
  map.set(entry.date, list);
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const kindA = a.kind ?? a.type;
    const kindB = b.kind ?? b.type;
    const orderA = SORT_ORDER.indexOf(kindA);
    const orderB = SORT_ORDER.indexOf(kindB);
    const safeA = orderA === -1 ? SORT_ORDER.length : orderA;
    const safeB = orderB === -1 ? SORT_ORDER.length : orderB;
    if (safeA !== safeB) return safeA - safeB;
    return String(a.title).localeCompare(String(b.title), "ar");
  });
}

export async function listCalendarAppointments(year, month) {
  const companyId = getCompanyId();
  const userId = getAuthUserId();
  if (!userId) return [];

  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from("calendar_appointments")
    .select("*")
    .eq("company_id", companyId)
    .eq("created_by", userId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_date", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function createCalendarAppointment(payload) {
  const companyId = getCompanyId();
  const userId = requireAuthUserId();
  const appointmentType = isValidUserAppointmentType(payload.appointment_type)
    ? payload.appointment_type
    : DEFAULT_APPOINTMENT_TYPE;

  const { data, error } = await supabase
    .from("calendar_appointments")
    .insert({
      company_id: companyId,
      created_by: userId,
      title: payload.title?.trim(),
      description: payload.description?.trim() || null,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time || null,
      appointment_type: appointmentType,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function deleteCalendarAppointment(id) {
  const companyId = getCompanyId();
  const userId = requireAuthUserId();

  const { error } = await supabase
    .from("calendar_appointments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("created_by", userId);

  if (error) throw new Error(mapDbError(error));
}

async function fetchCompanyEventsInMonth(year, month) {
  const companyId = getCompanyId();
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from("events")
    .select("id, name, description, event_datetime, location")
    .eq("company_id", companyId)
    .order("event_datetime", { ascending: true });

  if (error) throw new Error(mapDbError(error));

  return (data ?? []).filter((row) => {
    const date = eventDateFromTimestamp(row.event_datetime);
    return isDateInRange(date, start, end);
  });
}

export async function fetchCalendarMonthData(year, month) {
  const { start, end } = getMonthRange(year, month);
  const lang = currentLang();

  const [appointments, events, saudiHolidays] = await Promise.all([
    listCalendarAppointments(year, month),
    fetchCompanyEventsInMonth(year, month),
    Promise.resolve(getSaudiPublicHolidaysInRange(start, end, lang)),
  ]);

  const byDate = new Map();

  for (const row of appointments) {
    const appointmentType = row.appointment_type || DEFAULT_APPOINTMENT_TYPE;
    const meta = resolveAppointmentTypeMeta(appointmentType);

    pushEntry(byDate, {
      id: `appointment-${row.id}`,
      kind: appointmentType,
      type: "appointment",
      date: row.appointment_date,
      title: row.title,
      subtitle: row.description || undefined,
      time: row.appointment_time?.slice(0, 5) || undefined,
      sourceId: row.id,
      deletable: true,
      color: meta.color,
      typeLabelKey: meta.labelKey,
    });
  }

  for (const row of events) {
    const date = eventDateFromTimestamp(row.event_datetime);
    const meta = resolveAppointmentTypeMeta("event");

    pushEntry(byDate, {
      id: `event-${row.id}`,
      kind: "event",
      type: "event",
      date,
      title: row.name,
      subtitle: row.location || row.description || undefined,
      sourceId: row.id,
      color: meta.color,
      typeLabelKey: meta.labelKey,
      shared: true,
    });
  }

  for (const holiday of saudiHolidays) {
    const meta = resolveAppointmentTypeMeta("holiday");

    pushEntry(byDate, {
      id: holiday.id,
      kind: "holiday",
      type: "holiday",
      date: holiday.date,
      title: holiday.title,
      subtitle: holiday.subtitle,
      color: meta.color,
      typeLabelKey: meta.labelKey,
      shared: true,
    });
  }

  const sortedMap = new Map();
  for (const [date, items] of byDate.entries()) {
    sortedMap.set(date, sortEntries(items));
  }

  return sortedMap;
}
