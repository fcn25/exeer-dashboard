import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const nowUTC = new Date();

    // 1. Fetch all open permissions from today
    const { data: openPermissions, error: fetchError } = await supabase
      .from("attendance_permissions")
      .select(`
        id,
        employee_id,
        company_id,
        record_id,
        out_at,
        employees!inner (
          id,
          work_period_ids
        )
      `)
      .eq("permission_date", today)
      .eq("status", "out")
      .is("in_at", null);

    if (fetchError) throw fetchError;
    if (!openPermissions || openPermissions.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No open permissions" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch company work periods from company_settings
    const companyIds = [
      ...new Set(openPermissions.map((p) => p.company_id)),
    ];

    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_id, setting_key, setting_value")
      .in("company_id", companyIds)
      .eq("setting_key", "work_end_time");

    // Build company end time map
    const endTimeMap: Record<number, string> = {};
    for (const s of settings ?? []) {
      endTimeMap[s.company_id] = s.setting_value ?? "17:00";
    }

    let processed = 0;

    for (const permission of openPermissions) {
      const endTimeStr = endTimeMap[permission.company_id] ?? "17:00";
      const [endHour, endMin] = endTimeStr.split(":").map(Number);

      // Build end time as Date for today
      const shiftEnd = new Date();
      shiftEnd.setHours(endHour, endMin, 0, 0);

      // Only process if shift end has passed
      if (nowUTC < shiftEnd) continue;

      // 3. Close the permission
      await supabase
        .from("attendance_permissions")
        .update({
          status: "auto_closed",
          notes: "خروج تلقائي - لم يعد من الاستئذان",
          updated_at: new Date().toISOString(),
        })
        .eq("id", permission.id);

      // 4. Insert auto checkout log
      await supabase
        .from("attendance_logs")
        .insert({
          company_id: permission.company_id,
          employee_id: permission.employee_id,
          punch_type: "Out",
          punch_source: "auto_checkout",
          punched_at: shiftEnd.toISOString(),
          latitude: 0,
          longitude: 0,
          branch_id: null,
        });

      // 5. Update attendance_records checkout time
      if (permission.record_id) {
        await supabase
          .from("attendance_records")
          .update({
            check_out_1: endTimeStr,
            updated_at: new Date().toISOString(),
          })
          .eq("id", permission.record_id)
          .is("check_out_1", null);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ processed, message: "Auto checkout complete" }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
