import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { assertGeminiConfigured } from "../utils/geminiConfig.js";
import { generateInterviewQuestionsWithGemini } from "./geminiService.js";
import { assertSmartInterviewsRateLimit } from "./aiRateLimitService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول interview_archive غير جاهز. نفّذ ملف supabase/migrations/20250604000000_interview_archive.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function listInterviewArchives() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("interview_archive")
    .select("id, job_title, questions_text, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function saveInterviewArchive(jobTitle, questionsText) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("interview_archive")
    .insert({
      company_id: companyId,
      job_title: jobTitle,
      questions_text: questionsText,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function generateAndSaveInterviewArchive(jobTitle) {
  const trimmedTitle = String(jobTitle ?? "").trim();
  if (!trimmedTitle) {
    throw new Error("يرجى إدخال المسمى الوظيفي.");
  }

  assertGeminiConfigured();
  await assertSmartInterviewsRateLimit();

  const questionsText = await generateInterviewQuestionsWithGemini(trimmedTitle);
  const record = await saveInterviewArchive(trimmedTitle, questionsText);

  return {
    record,
    questionsText,
  };
}
