import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { workTimeToMinutes } from "../utils/attendance/workHours.js";
import {
  authenticateWithBiometric,
  captureCurrentPosition,
} from "./nativeBiometricService.js";
import { GEOFENCE_OUT_OF_RANGE_MESSAGE } from "../utils/attendance/geofence.js";
import {
  buildTodayAttendanceSummary,
  resolveNextPunch,
} from "../utils/attendance/summary.js";
import {
  fetchEmployeeAttendanceScheduleFromDb,
  toAttendanceScheduleContext,
} from "./employeeWorkScheduleService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول الحضور غير جاهزة. نفّذ migrations الحضور في Supabase.";
  }
  return error.message || "تعذّر تسجيل الحضور.";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowLocalTimeValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

async function uploadPunchSelfie(dataUrl, companyId, employeeId) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const timestamp = Date.now();
  const path = `${companyId}/${employeeId}/${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from("attendance-selfies")
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

async function calculateDelayMinutes(
  employeeId,
  companyId,
  punchType,
  punchedAt,
  todayRecord,
) {
  if (punchType !== "In") return 0;

  try {
    const schedule = await fetchEmployeeAttendanceScheduleFromDb(employeeId);
    const scheduleContext = toAttendanceScheduleContext(schedule);
    const nextPunch = resolveNextPunch(todayRecord, scheduleContext);
    const scheduledStart = nextPunch.activePeriod?.start;

    if (!scheduledStart) return 0;

    const scheduledMinutes = workTimeToMinutes(scheduledStart);
    const punchedMinutes = punchedAt.getHours() * 60 + punchedAt.getMinutes();

    if (punchedMinutes <= scheduledMinutes) return 0;
    return punchedMinutes - scheduledMinutes;
  } catch {
    return 0;
  }
}

async function verifyGeofenceViaRpc(latitude, longitude) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "تعذّر التحقق من الجلسة.");
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("تعذّر التحقق من الجلسة. أعد تسجيل الدخول.");
  }

  const { data, error } = await supabase.rpc("verify_attendance_geofence", {
    emp_user_id: userId,
    current_lat: latitude,
    current_lng: longitude,
  });

  if (error) {
    if (
      error.code === "PGRST202" ||
      String(error.message ?? "").includes("verify_attendance_geofence")
    ) {
      throw new Error(
        "دالة التحقق الجغرافي غير متوفرة. نفّذ migration verify_attendance_geofence في Supabase.",
      );
    }
    throw new Error(mapDbError(error));
  }

  const result = typeof data === "string" ? JSON.parse(data) : data;
  return {
    isWithinRadius: Boolean(result?.is_within_radius),
    distanceMeters: Number(result?.distance_meters),
  };
}

export async function fetchEmployeeWorkBranchInfo(employeeId) {
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    throw new Error("لم يتم ربط حسابك بسجل موظف.");
  }

  const { branch } = await fetchEmployeeWorkBranch(resolvedEmployeeId);
  return {
    branchName: branch.name,
    branchId: branch.id,
  };
}

async function fetchEmployeeWorkBranch(employeeId) {
  const companyId = requireCompanyId("تسجيل الحضور");

  const { data: employee, error: employeeError } = await scopeQueryByCompany(
    supabase
      .from("employees")
      .select("id, work_location_id, company_id")
      .eq("id", employeeId),
    companyId,
  ).maybeSingle();

  if (employeeError) throw new Error(mapDbError(employeeError));
  if (!employee) throw new Error("لم يتم العثور على سجل الموظف.");

  const branchId = employee.work_location_id;
  if (!branchId) {
    throw new Error(
      "لم يُحدد موقع عملك. تواصل مع الموارد البشرية لربطك بفرع العمل.",
    );
  }

  const { data: branch, error: branchError } = await scopeQueryByCompany(
    supabase
      .from("company_branches")
      .select("id, name, latitude, longitude, radius_meters")
      .eq("id", branchId),
    companyId,
  ).maybeSingle();

  if (branchError) throw new Error(mapDbError(branchError));
  if (!branch) {
    throw new Error("موقع العمل المُعيَّن غير موجود. تواصل مع الموارد البشرية.");
  }

  return {
    companyId,
    employeeId: employee.id,
    branch: {
      id: branch.id,
      name: branch.name,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      radiusMeters: Number(branch.radius_meters),
    },
  };
}

async function fetchTodayRecord(companyId, employeeId) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("attendance_records")
      .select(
        "id, check_in_1, check_out_1, check_in_2, check_out_2, status, delay_minutes",
      )
      .eq("employee_id", employeeId)
      .eq("record_date", todayIsoDate()),
    companyId,
  ).maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data ?? null;
}

async function insertAttendanceLog({
  companyId,
  employeeId,
  branchId,
  punchType,
  latitude,
  longitude,
  punchedAt,
  selfieUrl = null,
  delayMinutes = 0,
}) {
  const { error } = await supabase.from("attendance_logs").insert({
    company_id: companyId,
    employee_id: employeeId,
    branch_id: branchId,
    punch_type: punchType,
    latitude,
    longitude,
    punched_at: punchedAt,
    selfie_url: selfieUrl,
    delay_minutes: delayMinutes,
  });

  if (error) throw new Error(mapDbError(error));
}

async function upsertAttendanceRecord({
  companyId,
  employeeId,
  punchField,
  timeValue,
  existingRecord,
}) {
  const recordDate = todayIsoDate();

  if (!existingRecord) {
    const { error } = await supabase.from("attendance_records").insert({
      company_id: companyId,
      employee_id: employeeId,
      record_date: recordDate,
      status: "حضور",
      delay_minutes: 0,
      [punchField]: timeValue,
    });

    if (error) throw new Error(mapDbError(error));
    return;
  }

  const { error } = await supabase
    .from("attendance_records")
    .update({ [punchField]: timeValue })
    .eq("id", existingRecord.id);

  if (error) throw new Error(mapDbError(error));
}

/**
 * Full native punch flow: biometric → GPS → geofence → Supabase log + daily record.
 */
export async function performAttendancePunch(employeeId, selfieDataUrl = null) {
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    throw new Error("لم يتم ربط حسابك بسجل موظف.");
  }

  await authenticateWithBiometric();

  const coordinates = await captureCurrentPosition();

  const { companyId, branch } = await fetchEmployeeWorkBranch(resolvedEmployeeId);

  const geofence = await verifyGeofenceViaRpc(
    coordinates.latitude,
    coordinates.longitude,
  );

  if (!geofence.isWithinRadius) {
    throw new Error(GEOFENCE_OUT_OF_RANGE_MESSAGE);
  }

  const [todayRecord, schedule] = await Promise.all([
    fetchTodayRecord(companyId, resolvedEmployeeId),
    fetchEmployeeAttendanceScheduleFromDb(resolvedEmployeeId),
  ]);
  const scheduleContext = toAttendanceScheduleContext(schedule);
  const nextPunch = resolveNextPunch(todayRecord, scheduleContext);

  if (!nextPunch.canPunch) {
    throw new Error("اكتمل تسجيل الحضور والانصراف لهذا اليوم.");
  }

  const punchedAt = new Date();
  const timeValue = nowLocalTimeValue();

  let selfiePath = null;
  if (selfieDataUrl) {
    try {
      selfiePath = await uploadPunchSelfie(
        selfieDataUrl,
        companyId,
        resolvedEmployeeId,
      );
    } catch (uploadError) {
      console.error("attendance punch selfie upload failed:", uploadError);
    }
  }

  const delayMinutes = await calculateDelayMinutes(
    resolvedEmployeeId,
    companyId,
    nextPunch.punchType,
    punchedAt,
    todayRecord,
  );

  await insertAttendanceLog({
    companyId,
    employeeId: resolvedEmployeeId,
    branchId: branch.id,
    punchType: nextPunch.punchType,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    punchedAt: punchedAt.toISOString(),
    selfieUrl: selfiePath,
    delayMinutes,
  });

  await upsertAttendanceRecord({
    companyId,
    employeeId: resolvedEmployeeId,
    punchField: nextPunch.punchField,
    timeValue,
    existingRecord: todayRecord,
  });

  const updatedRecord = await fetchTodayRecord(companyId, resolvedEmployeeId);
  const summary = buildTodayAttendanceSummary(updatedRecord, scheduleContext);
  const next = resolveNextPunch(updatedRecord, scheduleContext);

  return {
    summary,
    nextPunch: next,
    branchName: branch.name,
    punchType: nextPunch.punchType,
  };
}
