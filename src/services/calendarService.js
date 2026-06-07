import { supabase } from "../utils/supabaseClient.js";
import { getAuthUser, getCompanyId } from "../utils/mobileAuth.js";
import { eventDateFromTimestamp, getMonthRange, isDateInRange } from "../utils/calendarDates.js";

export const CALENDAR_TYPES = {
  appointment: { color: "#6366f1", labelKey: "calendar.types.appointment" },
  event: { color: "#3b82f6", labelKey: "calendar.types.event" },
};

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول التقويم غير جاهز. نفّذ migration calendar_appointments في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function requireCurrentUserId() {
  const userId = getAuthUser()?.id;
  if (!userId) {
    throw new Error("يجب تسجيل الدخول لحفظ المواعيد الشخصية.");
  }
  return userId;
}

function pushEntry(map, entry) {
  if (!entry?.date) return;
  const list = map.get(entry.date) ?? [];
  list.push(entry);
  map.set(entry.date, list);
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const typeOrder = Object.keys(CALENDAR_TYPES);
    const typeDiff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    if (typeDiff !== 0) return typeDiff;
    return String(a.title).localeCompare(String(b.title), "ar");
  });
}

export async function listCalendarAppointments(year, month) {
  const companyId = getCompanyId();
  const userId = getAuthUser()?.id;
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
  const userId = requireCurrentUserId();

  const { data, error } = await supabase
    .from("calendar_appointments")
    .insert({
      company_id: companyId,
      created_by: userId,
      title: payload.title?.trim(),
      description: payload.description?.trim() || null,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time || null,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function deleteCalendarAppointment(id) {
  const companyId = getCompanyId();
  const userId = requireCurrentUserId();

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
  const [appointments, events] = await Promise.all([
    listCalendarAppointments(year, month),
    fetchCompanyEventsInMonth(year, month),
  ]);

  const byDate = new Map();

  for (const row of appointments) {
    pushEntry(byDate, {
      id: `appointment-${row.id}`,
      type: "appointment",
      date: row.appointment_date,
      title: row.title,
      subtitle: row.description || undefined,
      time: row.appointment_time?.slice(0, 5) || undefined,
      sourceId: row.id,
      deletable: true,
      color: CALENDAR_TYPES.appointment.color,
    });
  }

  for (const row of events) {
    const date = eventDateFromTimestamp(row.event_datetime);
    pushEntry(byDate, {
      id: `event-${row.id}`,
      type: "event",
      date,
      title: row.name,
      subtitle: row.location || row.description || undefined,
      sourceId: row.id,
      color: CALENDAR_TYPES.event.color,
    });
  }

  const sortedMap = new Map();
  for (const [date, items] of byDate.entries()) {
    sortedMap.set(date, sortEntries(items));
  }

  return sortedMap;
}
