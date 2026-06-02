import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { generateSmartGoalWithGemini } from "./geminiService.js";
import { assertSmartGoalsRateLimit } from "./aiRateLimitService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول smart_goals_archive غير جاهز. نفّذ ملف supabase/migrations/20250605000000_smart_goals_archive.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function listSmartGoalsArchives() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("smart_goals_archive")
    .select("id, original_goal, smart_goal_text, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function saveSmartGoalArchive(originalGoal, smartGoalText) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("smart_goals_archive")
    .insert({
      company_id: companyId,
      original_goal: originalGoal,
      smart_goal_text: smartGoalText,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function generateAndSaveSmartGoalArchive(originalGoal) {
  const trimmedGoal = String(originalGoal ?? "").trim();
  if (!trimmedGoal) {
    throw new Error("يرجى إدخال الهدف المبدئي.");
  }

  await assertSmartGoalsRateLimit();

  const smartGoalText = await generateSmartGoalWithGemini(trimmedGoal);
  const record = await saveSmartGoalArchive(trimmedGoal, smartGoalText);

  return {
    record,
    smartGoalText,
  };
}
