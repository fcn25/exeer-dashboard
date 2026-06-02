import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  buildEvaluationAnswersPayload,
  calculateEvaluationScore,
} from "../constants/evaluationCriteria.js";
import { generateExecutiveSummaryWithGemini } from "./geminiService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول إدارة الأداء غير جاهزة. نفّذ ملف supabase/migrations/20250610000000_performance_management.sql في Supabase SQL Editor.";
  }
  if (error.code === "PGRST200") {
    return "تعذّر ربط بيانات التقييم. تأكد من Foreign Keys ثم حدّث Schema Cache في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export const CYCLE_STATUS_LABELS = {
  Draft: "مسودة",
  Active: "نشطة",
  Completed: "مكتملة",
};

export async function listEvaluationCycles() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("evaluation_cycles")
    .select("id, name, start_date, end_date, status, ai_summary, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function getEvaluationCycleById(cycleId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("evaluation_cycles")
    .select("id, name, start_date, end_date, status, ai_summary, created_at")
    .eq("company_id", companyId)
    .eq("id", Number(cycleId))
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function listEvaluationTemplates() {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("id, category, title")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function createEvaluationCycleWithAssignments({
  name,
  startDate,
  endDate,
  templateId,
  employeeIds,
}) {
  const companyId = getCompanyId();
  const trimmedName = String(name ?? "").trim();
  const ids = [...new Set((employeeIds ?? []).map(Number).filter(Boolean))];

  if (!trimmedName) throw new Error("اسم الدورة مطلوب.");
  if (!startDate || !endDate) throw new Error("تاريخ البداية والنهاية مطلوبان.");
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
  }
  if (!templateId) throw new Error("يرجى اختيار نموذج التقييم.");
  if (ids.length === 0) throw new Error("يرجى اختيار موظف واحد على الأقل.");

  const { data: cycle, error: cycleError } = await supabase
    .from("evaluation_cycles")
    .insert({
      company_id: companyId,
      name: trimmedName,
      start_date: startDate,
      end_date: endDate,
      status: "Active",
    })
    .select()
    .single();

  if (cycleError) throw new Error(mapDbError(cycleError));

  const evaluationRows = ids.map((employeeId) => ({
    company_id: companyId,
    cycle_id: cycle.id,
    template_id: Number(templateId),
    evaluator_id: employeeId,
    evaluated_employee_id: employeeId,
    status: "Pending",
    answers: {},
  }));

  const { error: evaluationsError } = await supabase
    .from("employee_evaluations")
    .insert(evaluationRows);

  if (evaluationsError) {
    await supabase.from("evaluation_cycles").delete().eq("id", cycle.id);
    throw new Error(mapDbError(evaluationsError));
  }

  return cycle;
}

export async function listPendingEvaluationsForEmployee(employeeId) {
  const companyId = getCompanyId();
  if (!employeeId) return [];

  const { data, error } = await supabase
    .from("employee_evaluations")
    .select(
      `
      id,
      status,
      created_at,
      evaluation_cycles ( id, name, end_date ),
      evaluation_templates ( id, title )
    `,
    )
    .eq("company_id", companyId)
    .eq("evaluated_employee_id", Number(employeeId))
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function submitEmployeeEvaluation(evaluationId, ratings, generalComments) {
  const companyId = getCompanyId();
  const answers = buildEvaluationAnswersPayload(ratings, generalComments);

  const incomplete = Object.entries(ratings).some(
    ([, value]) => !Number(value) || Number(value) < 1 || Number(value) > 5,
  );
  if (incomplete) {
    throw new Error("يرجى تقييم جميع المعايير من 1 إلى 5.");
  }

  const score = calculateEvaluationScore(answers);
  const { data, error } = await supabase
    .from("employee_evaluations")
    .update({
      answers,
      score,
      status: "Completed",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", Number(evaluationId))
    .eq("status", "Pending")
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

function mapCompletedEvaluationRow(row, employeeLookup) {
  const employeeId = Number(row.evaluated_employee_id);
  const joined = row.employees ?? employeeLookup?.get(employeeId);
  const answers =
    row.answers && typeof row.answers === "object" ? row.answers : {};

  return {
    employeeName: joined?.full_name ?? "موظف",
    department: joined?.department ?? "—",
    score: row.score != null ? Number(row.score) : null,
    comments: String(answers.general_comments ?? "").trim(),
    answers,
  };
}

export async function fetchCompletedEvaluationsForCycle(cycleId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employee_evaluations")
    .select(
      "id, evaluated_employee_id, score, answers, status, employees:evaluated_employee_id ( full_name, department )",
    )
    .eq("company_id", companyId)
    .eq("cycle_id", Number(cycleId))
    .eq("status", "Completed");

  if (error) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("employee_evaluations")
      .select("id, evaluated_employee_id, score, answers, status")
      .eq("company_id", companyId)
      .eq("cycle_id", Number(cycleId))
      .eq("status", "Completed");

    if (fallbackError) throw new Error(mapDbError(fallbackError));

    const employeeIds = [
      ...new Set(
        (fallbackRows ?? [])
          .map((row) => Number(row.evaluated_employee_id))
          .filter(Boolean),
      ),
    ];

    let employeeLookup = new Map();
    if (employeeIds.length) {
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, full_name, department")
        .eq("company_id", companyId)
        .in("id", employeeIds);

      if (employeesError) throw new Error(mapDbError(employeesError));
      employeeLookup = new Map(
        (employees ?? []).map((employee) => [Number(employee.id), employee]),
      );
    }

    return (fallbackRows ?? []).map((row) =>
      mapCompletedEvaluationRow(row, employeeLookup),
    );
  }

  return (data ?? []).map((row) => mapCompletedEvaluationRow(row));
}

export function buildExecutiveSummaryPayload(cycle, evaluations) {
  return JSON.stringify(
    {
      cycle: {
        name: cycle?.name ?? "",
        start_date: cycle?.start_date ?? null,
        end_date: cycle?.end_date ?? null,
        status: cycle?.status ?? "",
        completed_evaluations_count: evaluations.length,
      },
      evaluations: evaluations.map((item) => ({
        employee_name: item.employeeName,
        department: item.department,
        overall_score_out_of_5: item.score,
        comments: item.comments || null,
        criteria_scores: {
          quality_of_work: item.answers?.quality_of_work ?? null,
          communication: item.answers?.communication ?? null,
          punctuality: item.answers?.punctuality ?? null,
          teamwork: item.answers?.teamwork ?? null,
          initiative: item.answers?.initiative ?? null,
        },
      })),
    },
    null,
    2,
  );
}

export async function saveCycleAiSummary(cycleId, aiSummary) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("evaluation_cycles")
    .update({ ai_summary: aiSummary })
    .eq("company_id", companyId)
    .eq("id", Number(cycleId))
    .select("id, name, ai_summary")
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function generateAndSaveCycleExecutiveSummary(cycleId) {
  const cycle = await getEvaluationCycleById(cycleId);
  if (!cycle) throw new Error("تعذّر العثور على دورة التقييم.");

  const evaluations = await fetchCompletedEvaluationsForCycle(cycleId);
  if (evaluations.length === 0) {
    throw new Error("لا توجد تقييمات مكتملة في هذه الدورة لتوليد الملخص.");
  }

  const payload = buildExecutiveSummaryPayload(cycle, evaluations);
  const aiSummary = await generateExecutiveSummaryWithGemini(payload);
  const saved = await saveCycleAiSummary(cycleId, aiSummary);

  return {
    cycle: saved,
    aiSummary,
    evaluationCount: evaluations.length,
  };
}
