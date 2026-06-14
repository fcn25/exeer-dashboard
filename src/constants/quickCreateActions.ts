import { normalizeAppRole } from "./roles.js";

export type QuickCreateGroup = "people" | "work";

export type QuickCreateOpenTarget =
  | { kind: "employee-modal" }
  | { kind: "task-modal" }
  | { kind: "event-modal" }
  | { kind: "note-modal" }
  | {
      kind: "route";
      desktop: string;
      mobile?: string;
    };

export type QuickCreateIconId =
  | "UserPlus"
  | "Gavel"
  | "ListTodo"
  | "Calendar"
  | "FileText";

export type QuickCreateAction = {
  id: string;
  label: string;
  icon: QuickCreateIconId;
  group: QuickCreateGroup;
  openTarget: QuickCreateOpenTarget;
  /** Case-sensitive — matches employees.role values after normalizeAppRole. */
  allowedRoles: readonly string[];
};

export const QUICK_CREATE_GROUP_LABELS: Record<QuickCreateGroup, string> = {
  people: "أشخاص",
  work: "عمل",
};

/**
 * Single source of truth for dashboard quick-create menu, role filtering, and command palette.
 * openTarget references existing panels/routes — no duplicate create forms.
 */
export const QUICK_CREATE_ACTIONS: readonly QuickCreateAction[] = [
  {
    id: "employee",
    label: "موظف",
    icon: "UserPlus",
    group: "people",
    openTarget: { kind: "employee-modal" },
    allowedRoles: ["owner", "Executive", "HR_Manager", "HR_Assistant"],
  },
  {
    id: "admin_action",
    label: "إجراء إداري",
    icon: "Gavel",
    group: "people",
    openTarget: {
      kind: "route",
      desktop: "/dashboard/administrative-actions",
      mobile: "/mobile/administrative-actions",
    },
    allowedRoles: ["owner", "Executive", "HR_Manager"],
  },
  {
    id: "task",
    label: "مهمة",
    icon: "ListTodo",
    group: "work",
    openTarget: { kind: "task-modal" },
    allowedRoles: [
      "owner",
      "Executive",
      "HR_Manager",
      "HR_Assistant",
      "Direct_Manager",
    ],
  },
  {
    id: "event",
    label: "فعالية",
    icon: "Calendar",
    group: "work",
    openTarget: { kind: "event-modal" },
    allowedRoles: [
      "owner",
      "Executive",
      "HR_Manager",
      "HR_Assistant",
      "Direct_Manager",
    ],
  },
  {
    id: "note",
    label: "ملاحظة",
    icon: "FileText",
    group: "work",
    openTarget: { kind: "note-modal" },
    allowedRoles: [
      "owner",
      "Executive",
      "HR_Manager",
      "HR_Assistant",
      "Direct_Manager",
      "Accountant",
    ],
  },
];

export function getQuickCreateActionsForRole(
  role: string | null | undefined,
): QuickCreateAction[] {
  const normalized = normalizeAppRole(role ?? "");
  return QUICK_CREATE_ACTIONS.filter((action) =>
    action.allowedRoles.includes(normalized),
  );
}

export function hasQuickCreateAccess(role: string | null | undefined): boolean {
  return getQuickCreateActionsForRole(role).length > 0;
}

export function findQuickCreateAction(
  id: string,
): QuickCreateAction | undefined {
  return QUICK_CREATE_ACTIONS.find((action) => action.id === id);
}
