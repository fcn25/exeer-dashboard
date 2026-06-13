import { normalizeAppRole } from "../../constants/roles.js";
import { EXAMPLE_PROMPTS_BY_ROLE } from "./constants/examplePrompts.js";
import { MOCK_SEARCH_EMPLOYEES } from "./constants/mockData.js";

const WRITE_VERB_PATTERN =
  /(?:^|\s)(?:غيّ?ر|أضف|وافق|سجّ?ل|حدّ?ث|احذف|أرسل|قدّ?م|انقل|ألغ|نفّ?ذ)/i;

function normalizeQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

function includesQuery(haystack, needle) {
  const a = normalizeQuery(haystack);
  const b = normalizeQuery(needle);
  if (!b) return false;
  return a.includes(b) || b.split(/\s+/).some((token) => token.length > 1 && a.includes(token));
}

export function looksLikeWriteCommand(text) {
  const normalized = normalizeQuery(text);
  if (!normalized) return false;
  if (WRITE_VERB_PATTERN.test(normalized)) return true;

  const roleExamples = Object.values(EXAMPLE_PROMPTS_BY_ROLE).flat();
  return roleExamples.some(
    (item) => item.kind === "write" && includesQuery(item.text, normalized),
  );
}

export function getMatchingSuggestions(text, role) {
  const normalizedRole = normalizeAppRole(role) ?? "Direct_Manager";
  const examples = EXAMPLE_PROMPTS_BY_ROLE[normalizedRole] ?? EXAMPLE_PROMPTS_BY_ROLE.Direct_Manager;
  const query = normalizeQuery(text);
  if (!query) return examples.filter((item) => item.kind === "read").slice(0, 4);

  return examples.filter(
    (item) => item.kind === "read" && includesQuery(item.text, query),
  );
}

export function getMatchingEmployees(text) {
  const query = normalizeQuery(text);
  if (!query) return [];

  return MOCK_SEARCH_EMPLOYEES.filter((employee) =>
    includesQuery(employee.full_name, query) ||
    includesQuery(employee.job_title_name, query) ||
    includesQuery(employee.department, query),
  );
}

export function hasStructuredMatches(text, role) {
  const query = normalizeQuery(text);
  if (!query) return false;
  return (
    getMatchingSuggestions(text, role).length > 0 ||
    getMatchingEmployees(text).length > 0
  );
}
