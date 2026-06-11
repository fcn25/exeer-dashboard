import {
  Banknote,
  Calendar,
  CheckSquare,
  CircleUser,
  Fingerprint,
  Gavel,
  Home,
  Lock,
  Settings,
  SlidersHorizontal,
  Target,
  Users,
  UsersRound,
} from "lucide-react";
import { normalizeAppRole } from "./roles.js";

/**
 * Single source of truth: which sidebar nav keys each role may see.
 * Edit ROLE_NAV only — do not hardcode nav visibility in layout components.
 */
export const ROLE_NAV = {
  owner: [
    "home",
    "tasks",
    "events",
    "employees",
    "admin_actions",
    "payroll",
    "attendance",
    "team",
    "performance",
    "self_service",
    "settings",
    "permissions",
    "system_customization",
  ],
  Executive: [
    "home",
    "tasks",
    "events",
    "employees",
    "admin_actions",
    "payroll",
    "attendance",
    "team",
    "performance",
    "self_service",
    "settings",
    "permissions",
    "system_customization",
  ],
  HR_Manager: [
    "home",
    "tasks",
    "events",
    "employees",
    "admin_actions",
    "payroll",
    "attendance",
    "team",
    "performance",
    "self_service",
    "settings",
  ],
  HR_Assistant: [
    "home",
    "tasks",
    "events",
    "employees",
    "admin_actions",
    "payroll",
    "attendance",
    "self_service",
  ],
  Direct_Manager: [
    "home",
    "tasks",
    "events",
    "team",
    "self_service",
    "settings_basic",
  ],
  Accountant: ["home", "payroll", "self_service"],
  Employee: ["home", "self_service"],
};

const NAV_ITEM_DEFS = {
  home: {
    to: "/dashboard",
    labelKey: "nav.home",
    icon: Home,
    end: true,
    section: "main",
  },
  tasks: {
    to: "/dashboard/tasks",
    labelKey: "nav.tasks",
    icon: CheckSquare,
    section: "main",
  },
  events: {
    to: "/dashboard/events",
    labelKey: "nav.events",
    icon: Calendar,
    section: "main",
  },
  employees: {
    to: "/dashboard/employees",
    labelKey: "nav.employees",
    icon: Users,
    section: "main",
  },
  admin_actions: {
    to: "/dashboard/administrative-actions",
    labelKey: "nav.adminActions",
    icon: Gavel,
    section: "main",
  },
  payroll: {
    to: "/dashboard/payroll",
    labelKey: "nav.payroll",
    icon: Banknote,
    section: "main",
  },
  attendance: {
    to: "/dashboard/attendance",
    labelKey: "nav.attendance",
    icon: Fingerprint,
    section: "main",
  },
  team: {
    to: "/dashboard/my-team",
    labelKey: "nav.myTeam",
    icon: UsersRound,
    section: "main",
  },
  performance: {
    to: "/dashboard/performance",
    labelKey: "nav.performance",
    icon: Target,
    section: "main",
  },
  self_service: {
    to: "/employee-portal",
    labelKey: "nav.selfService",
    icon: CircleUser,
    section: "main",
  },
  settings: {
    to: "/dashboard/settings",
    labelKey: "nav.settings",
    icon: Settings,
    section: "main",
  },
  settings_basic: {
    to: "/dashboard/settings",
    labelKey: "nav.settings",
    icon: Settings,
    section: "main",
  },
  permissions: {
    to: "/dashboard/permissions",
    labelKey: "nav.permissions",
    icon: Lock,
    section: "main",
  },
  system_customization: {
    to: "/dashboard/settings/system",
    labelKey: "nav.systemCustomization",
    icon: SlidersHorizontal,
    section: "system",
  },
};

export function getRoleNavKeys(role) {
  const normalized = normalizeAppRole(role);
  return ROLE_NAV[normalized] ?? ROLE_NAV.Employee;
}

export function roleHasNavKey(role, key) {
  return getRoleNavKeys(role).includes(key);
}

/**
 * Dashboard/mobile path → ROLE_NAV key (longest prefix wins).
 * Edit nav visibility via ROLE_NAV only; add path rules here when new routes ship.
 */
export const ROUTE_NAV_RULES = [
  { prefix: "/dashboard/settings/system", navKey: "system_customization" },
  { prefix: "/mobile/settings/system", navKey: "system_customization" },
  { prefix: "/dashboard/permissions", navKey: "permissions" },
  { prefix: "/dashboard/administrative-actions", navKey: "admin_actions" },
  { prefix: "/mobile/administrative-actions", navKey: "admin_actions" },
  { prefix: "/dashboard/attendance/settings", navKey: "system_customization" },
  { prefix: "/mobile/attendance/settings", navKey: "system_customization" },
  { prefix: "/dashboard/attendance", navKey: "attendance" },
  {
    prefix: "/mobile/attendance",
    navKey: "self_service",
    altNavKeys: ["attendance"],
  },
  { prefix: "/dashboard/payroll", navKey: "payroll" },
  { prefix: "/dashboard/employees", navKey: "employees" },
  { prefix: "/dashboard/events", navKey: "events" },
  { prefix: "/dashboard/tasks", navKey: "tasks" },
  { prefix: "/dashboard/my-team", navKey: "team" },
  { prefix: "/dashboard/performance", navKey: "performance" },
  {
    prefix: "/dashboard/settings",
    navKey: "settings",
    altNavKeys: ["settings_basic"],
  },
  {
    prefix: "/dashboard/subscription",
    navKey: "settings",
    altNavKeys: ["settings_basic"],
  },
  { prefix: "/dashboard", navKey: "home", exact: true },
  { prefix: "/employee-portal", navKey: "self_service" },
  { prefix: "/mobile/training", navKey: "self_service" },
  { prefix: "/mobile", navKey: "self_service", exact: true },
];

const SORTED_ROUTE_NAV_RULES = [...ROUTE_NAV_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

export function resolveRouteNavRule(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";

  for (const rule of SORTED_ROUTE_NAV_RULES) {
    if (rule.exact) {
      if (path === rule.prefix) return rule;
      continue;
    }
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule;
    }
  }

  return null;
}

export function roleCanAccessNavKey(role, navKey, altNavKeys = []) {
  if (!navKey) return true;
  const keys = getRoleNavKeys(role);
  if (keys.includes(navKey)) return true;
  return altNavKeys.some((key) => keys.includes(key));
}

export function roleCanAccessPath(role, pathname) {
  const rule = resolveRouteNavRule(pathname);
  if (!rule) return true;
  return roleCanAccessNavKey(role, rule.navKey, rule.altNavKeys ?? []);
}

/**
 * @param {string} role — from employee record via AuthContext
 * @param {(key: string) => string} translate — e.g. t from useAppLocale
 */
export function resolveSidebarNavItems(role, translate) {
  const keys = getRoleNavKeys(role);
  const mainNavItems = [];
  const systemNavItems = [];

  for (const key of keys) {
    const def = NAV_ITEM_DEFS[key];
    if (!def) continue;

    const item = {
      key,
      to: def.to,
      label: translate(def.labelKey),
      icon: def.icon,
      end: def.end,
    };

    if (def.section === "system") {
      systemNavItems.push(item);
    } else {
      mainNavItems.push(item);
    }
  }

  return { mainNavItems, systemNavItems };
}
