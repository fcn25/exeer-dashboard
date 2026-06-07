import { supabase } from "../utils/supabaseClient.js";
import { getAuthUser, getCompanyId } from "../utils/mobileAuth.js";
import {
  eventDateFromTimestamp,
  getContractAnniversaryInMonth,
  getMonthRange,
  getProbationEndDate,
  isDateInRange,
  isSaudiNationality,
} from "../utils/calendarDates.js";

export const CALENDAR_TYPES = {
  appointment: { color: "#6366f1", labelKey: "calendar.types.appointment" },
  event: { color: "#3b82f6", labelKey: "calendar.types.event" },
  task: { color: "#f59e0b", labelKey: "calendar.types.task" },
  contract: { color: "#ef4444", labelKey: "calendar.types.contract" },
  iqama: { color: "#ec4899", labelKey: "calendar.types.iqama" },
  probation: { color: "#8b5cf6", labelKey: "calendar.types.probation" },
};

const INACTIVE_EMPLOYMENT_STATUSES = new Set(["منتهي الخدمة", "موقوف"]);

const EMPLOYEE_SELECT =
  "id, full_name, nationality, employment_status, hire_date, job_title_name, iqama_expiry_date";

const TASK_SELECT =
  "id, title, description, deadline, status, assigned_to_name";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول التقويم غير جاهز. نفّذ migration calendar_appointments في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function isActiveEmployee(row) {
  const status = String(row?.employment_status ?? "").trim();
  return !INACTIVE_EMPLOYMENT_STATUSES.has(status);
}

function normalizeTaskTitle(row) {
  const title = String(row?.title ?? "").trim();
  if (title) return title;
  const description = String(row?.description ?? "").trim();
  return description.split("\n")[0]?.slice(0, 120) || "مهمة";
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
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from("calendar_appointments")
    .select("*")
    .eq("company_id", companyId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .order("appointment_date", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function createCalendarAppointment(payload) {
  const companyId = getCompanyId();
  const user = getAuthUser();

  const { data, error } = await supabase
    .from("calendar_appointments")
    .insert({
      company_id: companyId,
      created_by: user?.id ?? null,
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
  const { error } = await supabase
    .from("calendar_appointments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

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

async function fetchTasksInMonth(year, month) {
  const companyId = getCompanyId();
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("company_id", companyId)
    .not("deadline", "is", null)
    .gte("deadline", start)
    .lte("deadline", end)
    .order("deadline", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

async function fetchEmployeesForCalendar() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("company_id", companyId);

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

function buildEmployeeDateEntries(employees, year, month) {
  const entries = [];
  const { start, end } = getMonthRange(year, month);

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;

    const name = employee.full_name ?? "موظف";
    const job = employee.job_title_name ?? "";

    if (employee.hire_date) {
      const contractDate = getContractAnniversaryInMonth(
        employee.hire_date,
        year,
        month,
      );
      if (contractDate) {
        entries.push({
          id: `contract-${employee.id}-${contractDate}`,
          type: "contract",
          date: contractDate,
          title: `انتهاء عقد — ${name}`,
          subtitle: job ? `${job} · بداية العقد ${employee.hire_date}` : `بداية العقد ${employee.hire_date}`,
          sourceId: employee.id,
          color: CALENDAR_TYPES.contract.color,
        });
      }

      const probationDate = getProbationEndDate(employee.hire_date);
      if (isDateInRange(probationDate, start, end)) {
        entries.push({
          id: `probation-${employee.id}-${probationDate}`,
          type: "probation",
          date: probationDate,
          title: `نهاية التجربة — ${name}`,
          subtitle: job || undefined,
          sourceId: employee.id,
          color: CALENDAR_TYPES.probation.color,
        });
      }
    }

    if (
      employee.iqama_expiry_date &&
      !isSaudiNationality(employee.nationality) &&
      isDateInRange(employee.iqama_expiry_date, start, end)
    ) {
      entries.push({
        id: `iqama-${employee.id}-${employee.iqama_expiry_date}`,
        type: "iqama",
        date: employee.iqama_expiry_date,
        title: `انتهاء إقامة — ${name}`,
        subtitle: job || undefined,
        sourceId: employee.id,
        color: CALENDAR_TYPES.iqama.color,
      });
    }
  }

  return entries;
}

export async function fetchCalendarMonthData(year, month) {
  const [appointments, events, tasks, employees] = await Promise.all([
    listCalendarAppointments(year, month),
    fetchCompanyEventsInMonth(year, month),
    fetchTasksInMonth(year, month),
    fetchEmployeesForCalendar(),
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

  for (const row of tasks) {
    const status = String(row.status ?? "").trim();
    if (status === "مكتمل" || status === "completed") continue;

    pushEntry(byDate, {
      id: `task-${row.id}`,
      type: "task",
      date: row.deadline,
      title: normalizeTaskTitle(row),
      subtitle: row.assigned_to_name
        ? `مُسندة إلى ${row.assigned_to_name}`
        : undefined,
      sourceId: row.id,
      color: CALENDAR_TYPES.task.color,
    });
  }

  for (const entry of buildEmployeeDateEntries(employees, year, month)) {
    pushEntry(byDate, entry);
  }

  const sortedMap = new Map();
  for (const [date, items] of byDate.entries()) {
    sortedMap.set(date, sortEntries(items));
  }

  return sortedMap;
}
