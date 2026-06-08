import { supabase } from "../utils/supabaseClient.js";
import { TEMPLATE_UI_SEED_TITLE_AR } from "../constants/performanceTemplates.js";
import { resolveTemplateContentPayload } from "../utils/evaluationTemplateContent.js";
import {
  fetchEvaluationTemplateById,
  fetchEvaluationTemplateRows,
  getEvaluationTemplateEmbedSelect,
  normalizeEmbeddedTemplate,
} from "../utils/evaluationTemplateDb.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { listDepartments } from "./catalogService.js";
import {
  buildEvaluationAnswersPayload,
  calculateEvaluationScore,
  EVALUATION_CRITERIA,
} from "../constants/evaluationCriteria.js";
import {
  calculateDynamicEvaluationScore,
  formatAnswersForSummary,
  getLegacyDefaultQuestions,
  normalizeAnswersPayload,
  parseTemplateQuestions,
  resolveEvaluationQuestions,
  validateTemplateAnswers,
} from "../utils/evaluationTemplateQuestions.js";
import { notifyEvaluationAssignments } from "./notificationsService.js";
import { listActiveEmployees } from "./employeesService.js";
import { generateExecutiveSummaryWithGemini } from "./geminiService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول إدارة الأداء غير جاهزة. نفّذ ملفات migrations الخاصة بالأداء في Supabase SQL Editor.";
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

export const AI_SUMMARY_MIN_COMPLETION_PERCENT = 80;

const ACTIVE_STATUSES = ["نشط", "Active", "active"];

function isActiveEmployee(row) {
  return ACTIVE_STATUSES.includes(String(row?.employment_status ?? "").trim());
}

function mapPendingResponseRow(row) {
  const cycle = row.evaluation_cycles ?? {};
  const template =
    cycle.evaluation_templates ??
    (cycle.template_id ? { id: cycle.template_id, title: "نموذج تقييم" } : null);

  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    source: "response",
    evaluation_cycles: {
      id: cycle.id,
      name: cycle.name,
      end_date: cycle.end_date,
    },
    evaluation_templates: template
      ? normalizeEmbeddedTemplate(template)
      : { id: null, title: "نموذج تقييم", questions_jsonb: null },
  };
}

function resolveCompanyId(context) {
  try {
    return requireCompanyId(context);
  } catch {
    return getCompanyId();
  }
}

export async function listEvaluationCycles() {
  const companyId = resolveCompanyId("دورات التقييم");
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("evaluation_cycles")
      .select(
        "id, name, start_date, end_date, status, ai_summary, template_id, target_department, created_at",
      )
      .order("created_at", { ascending: false }),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function getEvaluationCycleById(cycleId) {
  const companyId = resolveCompanyId("تفاصيل دورة التقييم");
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("evaluation_cycles")
      .select(
        "id, name, start_date, end_date, status, ai_summary, template_id, target_department, created_at",
      )
      .eq("id", Number(cycleId)),
    companyId,
  ).maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function listEvaluationTemplates() {
  try {
    return await fetchEvaluationTemplateRows();
  } catch (error) {
    throw new Error(mapDbError(error));
  }
}

export async function getEvaluationTemplateById(templateId) {
  if (!templateId) return null;

  try {
    return await fetchEvaluationTemplateById(templateId);
  } catch (error) {
    throw new Error(mapDbError(error));
  }
}

export function resolveEvaluationTemplateId(title, templates = [], uiTemplateId = "") {
  const normalized = String(title ?? "").trim();
  if (!normalized) return null;

  const withQuestions = templates.filter((row) => {
    const payload = resolveTemplateContentPayload(row);
    return (
      (payload?.categories?.length ?? 0) > 0 ||
      (payload?.questions?.length ?? 0) > 0
    );
  });

  const pool = withQuestions.length ? withQuestions : templates;

  const seedTitle = uiTemplateId ? TEMPLATE_UI_SEED_TITLE_AR[uiTemplateId] : "";
  if (seedTitle) {
    const bySeed = pool.find((row) => row.title === seedTitle);
    if (bySeed) return bySeed.id;
  }

  const exact = pool.find((row) => row.title === normalized);
  if (exact) return exact.id;

  const partial = pool.find(
    (row) =>
      normalized.includes(row.title) || row.title.includes(normalized),
  );
  return partial?.id ?? null;
}

export async function listCompanyDepartments() {
  resolveCompanyId("أقسام التقييم");
  const employees = await listActiveEmployees();
  const fromEmployees = new Set(
    employees
      .map((row) => String(row.department ?? "").trim())
      .filter(Boolean),
  );

  const catalog = await listDepartments();
  const matched = catalog.filter((name) => fromEmployees.has(name));
  if (matched.length) return matched;

  return [...fromEmployees].sort((a, b) => a.localeCompare(b, "ar"));
}

export async function listEmployeesByDepartment(department) {
  const trimmed = String(department ?? "").trim();
  if (!trimmed) return [];

  const employees = await listActiveEmployees();
  return employees.filter(
    (employee) => String(employee.department ?? "").trim() === trimmed,
  );
}

export async function getCycleResponseProgress(cycleId) {
  const companyId = resolveCompanyId("تقدّم دورة التقييم");
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("evaluation_responses")
      .select("status")
      .eq("cycle_id", Number(cycleId)),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));

  const rows = data ?? [];
  const total = rows.length;
  const completed = rows.filter((row) => row.status === "completed").length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, pending, percentage };
}

export async function launchEvaluationCycleForDepartment({
  name,
  startDate,
  endDate,
  templateId,
  department,
}) {
  const companyId = requireCompanyId("إطلاق دورة التقييم");
  const trimmedName = String(name ?? "").trim();
  const trimmedDepartment = String(department ?? "").trim();

  if (!trimmedName) throw new Error("اسم الدورة مطلوب.");
  if (!startDate || !endDate) throw new Error("تاريخ البداية والنهاية مطلوبان.");
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
  }
  if (!templateId) throw new Error("يرجى اختيار نموذج التقييم.");
  if (!trimmedDepartment) throw new Error("يرجى اختيار القسم المستهدف.");

  const departmentEmployees = await listEmployeesByDepartment(trimmedDepartment);
  const employeeIds = departmentEmployees.map((employee) => Number(employee.id));

  if (employeeIds.length === 0) {
    throw new Error("لا يوجد موظفون نشطون في هذا القسم.");
  }

  const { data: cycle, error: cycleError } = await supabase
    .from("evaluation_cycles")
    .insert({
      company_id: companyId,
      name: trimmedName,
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      template_id: Number(templateId),
      target_department: trimmedDepartment,
    })
    .select()
    .single();

  if (cycleError) throw new Error(mapDbError(cycleError));

  const responseRows = employeeIds.map((employeeId) => ({
    company_id: companyId,
    cycle_id: cycle.id,
    employee_id: employeeId,
    answers: {},
    status: "pending",
  }));

  const { error: responsesError } = await supabase
    .from("evaluation_responses")
    .insert(responseRows);

  if (responsesError) {
    await scopeQueryByCompany(
      supabase.from("evaluation_cycles").delete(),
      companyId,
    ).eq("id", cycle.id);
    throw new Error(mapDbError(responsesError));
  }

  try {
    await notifyEvaluationAssignments(employeeIds);
  } catch (notifyError) {
    console.warn("Evaluation notifications failed:", notifyError);
  }

  return {
    cycle,
    assignedCount: employeeIds.length,
  };
}

/** @deprecated Use launchEvaluationCycleForDepartment */
export async function createEvaluationCycleWithAssignments({
  name,
  startDate,
  endDate,
  templateId,
  employeeIds,
  department,
}) {
  if (department) {
    return launchEvaluationCycleForDepartment({
      name,
      startDate,
      endDate,
      templateId,
      department,
    });
  }

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

  const { data: employees } = await supabase
    .from("employees")
    .select("id, department, employment_status")
    .eq("company_id", companyId)
    .in("id", ids);

  const activeIds = (employees ?? [])
    .filter(isActiveEmployee)
    .map((employee) => Number(employee.id));

  const targetDepartment =
    [...new Set((employees ?? []).map((employee) => employee.department).filter(Boolean))][0] ??
    "مخصص";

  const { data: cycle, error: cycleError } = await supabase
    .from("evaluation_cycles")
    .insert({
      company_id: companyId,
      name: trimmedName,
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      template_id: Number(templateId),
      target_department: targetDepartment,
    })
    .select()
    .single();

  if (cycleError) throw new Error(mapDbError(cycleError));

  const responseRows = activeIds.map((employeeId) => ({
    company_id: companyId,
    cycle_id: cycle.id,
    employee_id: employeeId,
    answers: {},
    status: "pending",
  }));

  const { error: responsesError } = await supabase
    .from("evaluation_responses")
    .insert(responseRows);

  if (responsesError) {
    await supabase.from("evaluation_cycles").delete().eq("id", cycle.id);
    throw new Error(mapDbError(responsesError));
  }

  try {
    await notifyEvaluationAssignments(activeIds);
  } catch (notifyError) {
    console.warn("Evaluation notifications failed:", notifyError);
  }

  return cycle;
}

export async function listCompanyPendingEvaluations({ limit = 50 } = {}) {
  const companyId = getCompanyId();

  const { data, error } = await supabase
    .from("evaluation_responses")
    .select(
      `
      id,
      status,
      created_at,
      employee_id,
      employees ( full_name ),
      evaluation_cycles (
        id,
        name,
        end_date,
        template_id,
        evaluation_templates:template_id ( ${getEvaluationTemplateEmbedSelect()} )
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(mapDbError(error));

  return (data ?? []).map((row) => {
    const mapped = mapPendingResponseRow(row);
    return {
      ...mapped,
      employeeName: row.employees?.full_name ?? "—",
    };
  });
}

export async function listPendingEvaluationsForEmployee(employeeId) {
  const companyId = getCompanyId();
  if (!employeeId) return [];

  const { data, error } = await supabase
    .from("evaluation_responses")
    .select(
      `
      id,
      status,
      created_at,
      evaluation_cycles (
        id,
        name,
        end_date,
        template_id,
        evaluation_templates:template_id ( ${getEvaluationTemplateEmbedSelect()} )
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("employee_id", Number(employeeId))
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return listPendingLegacyEvaluationsForEmployee(employeeId);
  }

  const mapped = (data ?? []).map(mapPendingResponseRow);
  if (mapped.length > 0) return mapped;

  return listPendingLegacyEvaluationsForEmployee(employeeId);
}

async function listPendingLegacyEvaluationsForEmployee(employeeId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employee_evaluations")
    .select(
      `
      id,
      status,
      created_at,
      evaluation_cycles ( id, name, end_date ),
      evaluation_templates ( ${getEvaluationTemplateEmbedSelect()} )
    `,
    )
    .eq("company_id", companyId)
    .eq("evaluated_employee_id", Number(employeeId))
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));

  return (data ?? []).map((row) => ({
    ...row,
    source: "legacy",
  }));
}

export async function submitEmployeeEvaluation(
  evaluationId,
  rawAnswers,
  template = null,
) {
  const companyId = getCompanyId();
  const questions = resolveEvaluationQuestions(template);
  const validationError = validateTemplateAnswers(questions, rawAnswers);

  if (validationError) {
    throw new Error(validationError);
  }

  const hasDynamicQuestions = parseTemplateQuestions(template).length > 0;

  const answers = hasDynamicQuestions
    ? normalizeAnswersPayload(questions, rawAnswers)
    : buildEvaluationAnswersPayload(
        {
          quality_of_work: rawAnswers.quality_of_work,
          communication: rawAnswers.communication,
          punctuality: rawAnswers.punctuality,
          teamwork: rawAnswers.teamwork,
          initiative: rawAnswers.initiative,
        },
        rawAnswers.general_comments,
      );

  const { data: responseRow, error: responseError } = await supabase
    .from("evaluation_responses")
    .update({
      answers,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", Number(evaluationId))
    .eq("status", "pending")
    .select()
    .single();

  if (!responseError && responseRow) {
    return responseRow;
  }

  const score = hasDynamicQuestions
      ? calculateDynamicEvaluationScore(questions, answers)
      : calculateEvaluationScore(answers);

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

function mapCompletedResponseRow(row, employeeLookup, questions = []) {
  const employeeId = Number(row.employee_id);
  const joined = row.employees ?? employeeLookup?.get(employeeId);
  const answers = row.answers && typeof row.answers === "object" ? row.answers : {};
  const resolvedQuestions =
    questions.length > 0 ? questions : getLegacyDefaultQuestions();

  return {
    employeeName: joined?.full_name ?? "موظف",
    department: joined?.department ?? "—",
    score:
      calculateDynamicEvaluationScore(resolvedQuestions, answers) ??
      calculateEvaluationScore(answers),
    comments: String(answers.general_comments ?? "").trim(),
    answers,
    completedAt: row.completed_at ?? null,
    answerSummaryLines: formatAnswersForSummary(resolvedQuestions, answers),
  };
}

export async function fetchCompletedResponsesForCycle(cycleId) {
  const companyId = getCompanyId();
  const cycle = await getEvaluationCycleById(cycleId);
  const template = cycle?.template_id
    ? await getEvaluationTemplateById(cycle.template_id)
    : null;
  const questions = resolveEvaluationQuestions(template);

  const { data, error } = await supabase
    .from("evaluation_responses")
    .select(
      "id, employee_id, answers, status, completed_at, employees:employee_id ( full_name, department )",
    )
    .eq("company_id", companyId)
    .eq("cycle_id", Number(cycleId))
    .eq("status", "completed");

  if (error) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("evaluation_responses")
      .select("id, employee_id, answers, status, completed_at")
      .eq("company_id", companyId)
      .eq("cycle_id", Number(cycleId))
      .eq("status", "completed");

    if (fallbackError) throw new Error(mapDbError(fallbackError));

    const employeeIds = [
      ...new Set(
        (fallbackRows ?? []).map((row) => Number(row.employee_id)).filter(Boolean),
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
      mapCompletedResponseRow(row, employeeLookup, questions),
    );
  }

  return (data ?? []).map((row) => mapCompletedResponseRow(row, null, questions));
}

export function aggregateEvaluationResponsesText(cycle, responses) {
  const criteriaLabels = Object.fromEntries(
    EVALUATION_CRITERIA.map((item) => [item.key, item.label]),
  );

  const lines = [
    `# دورة التقييم: ${cycle?.name ?? "—"}`,
    `القسم المستهدف: ${cycle?.target_department ?? "—"}`,
    `الفترة: ${cycle?.start_date ?? "—"} → ${cycle?.end_date ?? "—"}`,
    `عدد الاستجابات المكتملة: ${responses.length}`,
    "",
  ];

  responses.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.employeeName}`);
    lines.push(`- القسم: ${item.department}`);
    if (item.score != null) {
      lines.push(`- المتوسط العام: ${item.score} / 5`);
    }

    if (item.answerSummaryLines?.length) {
      lines.push(...item.answerSummaryLines);
    } else {
      EVALUATION_CRITERIA.forEach((criterion) => {
        const value = item.answers?.[criterion.key];
        if (value != null && Number(value) > 0) {
          lines.push(`- ${criteriaLabels[criterion.key]}: ${value}/5`);
        }
      });
    }

    if (item.comments) {
      lines.push(`- ملاحظات: ${item.comments}`);
    }

    lines.push("");
  });

  return lines.join("\n");
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

export async function listCompletedEvaluationSummariesForEmployee(employeeId) {
  const companyId = getCompanyId();
  const empId = Number(employeeId);
  if (!empId) return "";

  const lines = [];

  const { data: responses, error: responsesError } = await supabase
    .from("evaluation_responses")
    .select(
      `
      id,
      answers,
      completed_at,
      evaluation_cycles ( name )
    `,
    )
    .eq("company_id", companyId)
    .eq("employee_id", empId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  if (!responsesError && responses?.length) {
    responses.forEach((row, index) => {
      const answers =
        row.answers && typeof row.answers === "object" ? row.answers : {};
      const cycleName = row.evaluation_cycles?.name ?? "دورة تقييم";
      const score =
        calculateDynamicEvaluationScore(getLegacyDefaultQuestions(), answers) ??
        calculateEvaluationScore(answers);
      const comments = String(answers.general_comments ?? "").trim();

      lines.push(`${index + 1}. ${cycleName}`);
      if (score != null) lines.push(`   المتوسط: ${score} / 5`);
      if (comments) lines.push(`   ملاحظات: ${comments}`);
    });
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("employee_evaluations")
    .select(
      "id, score, answers, updated_at, evaluation_cycles ( name )",
    )
    .eq("company_id", companyId)
    .eq("evaluated_employee_id", empId)
    .eq("status", "Completed")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (!legacyError && legacyRows?.length) {
    legacyRows.forEach((row, index) => {
      const answers =
        row.answers && typeof row.answers === "object" ? row.answers : {};
      const cycleName = row.evaluation_cycles?.name ?? "تقييم سابق";
      const comments = String(answers.general_comments ?? "").trim();
      const offset = lines.length;

      lines.push(`${offset + index + 1}. ${cycleName} (سجل قديم)`);
      if (row.score != null) lines.push(`   المتوسط: ${Number(row.score)} / 5`);
      if (comments) lines.push(`   ملاحظات: ${comments}`);
    });
  }

  if (!lines.length) {
    return "لا توجد تقييمات مكتملة لهذا الموظف — يمكنك إدخال ملخص يدوياً.";
  }

  return lines.join("\n");
}

export async function fetchCompletedEvaluationsForCycle(cycleId) {
  const responses = await fetchCompletedResponsesForCycle(cycleId);
  if (responses.length > 0) return responses;

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
        target_department: cycle?.target_department ?? null,
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

  const progress = await getCycleResponseProgress(cycleId);
  if (progress.percentage < AI_SUMMARY_MIN_COMPLETION_PERCENT) {
    throw new Error(
      `لا يمكن توليد الملخص التنفيذي حتى يصل إنجاز الدورة إلى ${AI_SUMMARY_MIN_COMPLETION_PERCENT}% على الأقل (الحالي: ${progress.percentage}%).`,
    );
  }

  const responses = await fetchCompletedResponsesForCycle(cycleId);
  if (responses.length === 0) {
    throw new Error("لا توجد استجابات مكتملة في هذه الدورة لتوليد الملخص.");
  }

  const aggregatedText = aggregateEvaluationResponsesText(cycle, responses);
  const aiSummary = await generateExecutiveSummaryWithGemini(aggregatedText);
  const saved = await saveCycleAiSummary(cycleId, aiSummary);

  return {
    cycle: saved,
    aiSummary,
    evaluationCount: responses.length,
    completionPercent: progress.percentage,
  };
}
