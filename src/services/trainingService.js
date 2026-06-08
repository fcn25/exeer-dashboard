import { getCompanyId } from "../utils/mobileAuth.js";
import {
  listManagerHrRequestsByKind,
  submitManagerHrRequest,
} from "./myTeamService.js";

const SKILLS_STORAGE_PREFIX = "exeer_team_skills";

function skillsStorageKey() {
  return `${SKILLS_STORAGE_PREFIX}_${getCompanyId()}`;
}

function readSkillsStore() {
  try {
    const raw = localStorage.getItem(skillsStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSkillsStore(entries) {
  localStorage.setItem(skillsStorageKey(), JSON.stringify(entries));
}

export async function submitTrainingRequest({ employeeId, details }) {
  return submitManagerHrRequest({
    requestKind: "training",
    details,
    employeeId,
  });
}

export async function listTrainingRequests({ limit = 50 } = {}) {
  return listManagerHrRequestsByKind("training", { limit });
}

export function listTeamSkillsAndTalents() {
  return readSkillsStore().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function addTeamSkillAndTalent({
  employeeId,
  employeeName,
  skill,
  talent,
}) {
  const trimmedSkill = String(skill ?? "").trim();
  const trimmedTalent = String(talent ?? "").trim();

  if (!employeeId) throw new Error("اختر الموظف.");
  if (!trimmedSkill && !trimmedTalent) {
    throw new Error("أدخل مهارة أو موهبة على الأقل.");
  }

  const entry = {
    id: `${Date.now()}-${employeeId}`,
    employeeId: Number(employeeId),
    employeeName: String(employeeName ?? "").trim() || "موظف",
    skill: trimmedSkill,
    talent: trimmedTalent,
    updatedAt: new Date().toISOString(),
  };

  const next = [entry, ...readSkillsStore()];
  writeSkillsStore(next);
  return entry;
}

export function stripTrainingRequestMarker(details) {
  return String(details ?? "")
    .replace(/^\[طلب تدريب\]\s*/u, "")
    .trim();
}
