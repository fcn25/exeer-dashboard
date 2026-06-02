import { GoogleGenerativeAI } from "@google/generative-ai";

const FLASH_MODEL = "gemini-2.0-flash";

const TASK_SYSTEM_PROMPT =
  "You are an expert HR assistant. Take the following brief task idea and expand it into a highly professional, detailed task description with clear actionable bullet points. The output MUST be in formal Arabic.";

const INTERVIEW_SYSTEM_PROMPT =
  "You are an expert HR Recruitment Director. The user will provide a job title. Generate 5 to 7 highly professional, behavioral, and technical interview questions for this specific role. The output MUST be in formal, professional Arabic, formatted clearly with bullet points.";

const SMART_GOAL_SYSTEM_PROMPT =
  "You are an expert HR and Performance Management Consultant. The user will provide a rough, general goal. Transform this into a highly professional SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Provide a clear, actionable execution plan with a suggested timeframe. The output MUST be in formal, professional Arabic, beautifully formatted with bold headers and bullet points.";

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "مفتاح Gemini غير مُعدّ. أضف VITE_GEMINI_API_KEY إلى ملف .env",
    );
  }
  return key;
}

async function generateWithGemini(systemInstruction, userContent) {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({
    model: FLASH_MODEL,
    systemInstruction,
  });

  const result = await model.generateContent(userContent);
  const text = result.response.text()?.trim();

  if (!text) {
    throw new Error("لم يُرجع Gemini نصاً — حاول مرة أخرى.");
  }

  return text;
}

export async function expandTaskBriefWithGemini(brief) {
  const trimmed = String(brief ?? "").trim();
  if (!trimmed) {
    throw new Error("يرجى إدخال فكرة المهمة.");
  }

  return generateWithGemini(TASK_SYSTEM_PROMPT, trimmed);
}

export async function generateInterviewQuestionsWithGemini(jobTitle) {
  const trimmed = String(jobTitle ?? "").trim();
  if (!trimmed) {
    throw new Error("يرجى إدخال المسمى الوظيفي.");
  }

  return generateWithGemini(
    INTERVIEW_SYSTEM_PROMPT,
    `المسمى الوظيفي: ${trimmed}`,
  );
}

export async function generateSmartGoalWithGemini(originalGoal) {
  const trimmed = String(originalGoal ?? "").trim();
  if (!trimmed) {
    throw new Error("يرجى إدخال الهدف المبدئي.");
  }

  return generateWithGemini(
    SMART_GOAL_SYSTEM_PROMPT,
    `الهدف المبدئي: ${trimmed}`,
  );
}

function buildMonthlyReportPrompt(industry, metricsText) {
  return `You are an elite, highly pragmatic Management and HR Consultant specializing exclusively in the ${industry} sector. Review this month's brief HR data: ${metricsText}. Generate a highly actionable, sector-specific monthly performance report. DO NOT use generic, fluffy, or theoretical corporate jargon. Your analysis must reflect the actual operational realities, seasonalities, and common challenges of the ${industry} market. Provide a sharp executive summary, performance analysis, and 3 concrete, realistic strategic recommendations for the upcoming month. Output strictly in highly professional, formal Arabic, formatted beautifully with Markdown headers and bullet points.`;
}

export async function generateMonthlyReportWithGemini(industry, metricsText) {
  const sector = String(industry ?? "").trim() || "الخدمات العامة";
  const metrics = String(metricsText ?? "").trim() || "لا تتوفر بيانات كافية.";

  return generateWithGemini(
    buildMonthlyReportPrompt(sector, metrics),
    "ولّد التقرير الشهري الآن بناءً على البيانات والقطاع المحدّد.",
  );
}

const PERSONAL_MENTOR_SYSTEM_PROMPT =
  "You are a supportive HR Mentor. Generate a personal, motivating monthly feedback report for this employee based on their recent completed tasks and achievements. Keep it constructive, practical, and highly professional in formal Arabic. Format cleanly with Markdown headers and bullet points.";

export async function generatePersonalMentorReportWithGemini(employeeMetricsText) {
  const metrics = String(employeeMetricsText ?? "").trim() || "لا تتوفر بيانات كافية.";

  return generateWithGemini(
    PERSONAL_MENTOR_SYSTEM_PROMPT,
    `بيانات الموظف:\n${metrics}\n\nولّد تقرير الأداء الشخصي الآن.`,
  );
}

const EXECUTIVE_SUMMARY_SYSTEM_PROMPT =
  "You are an elite Organizational Psychologist and HR Consultant. I will provide you with the raw data of an employee evaluation cycle (scores out of 5 and comments). Analyze this data deeply. Generate an Executive Summary for the CEO in formal, professional Arabic. Your report MUST include: 1. نظرة عامة على الأداء (General Overview). 2. أبرز نقاط القوة المؤسسية (Key Strengths). 3. فجوات الأداء ومناطق التطوير (Performance Gaps). 4. توصيات استراتيجية للربع القادم (Strategic Recommendations). Do not mention individual employee names in a negative context, focus on trends. Format the response strictly in Markdown.";

export async function generateExecutiveSummaryWithGemini(cyclePayloadText) {
  const payload = String(cyclePayloadText ?? "").trim() || "لا تتوفر بيانات كافية.";

  return generateWithGemini(
    EXECUTIVE_SUMMARY_SYSTEM_PROMPT,
    `بيانات دورة التقييم:\n${payload}\n\nولّد الملخص التنفيذي الآن.`,
  );
}
