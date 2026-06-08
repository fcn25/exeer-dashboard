/**
 * Dashboard route access rules (permission keys from role_permissions).
 * `null` = any authenticated dashboard user.
 */
export const DASHBOARD_ROUTE_ACCESS = {
  "/dashboard": null,
  "/dashboard/tasks": null,
  "/dashboard/employees": { permission: "can_edit_employees" },
  "/dashboard/events": { permission: "can_manage_events" },
  "/dashboard/payroll": {
    permission: "can_view_payroll",
    roles: ["Accountant"],
  },
  "/dashboard/performance": {
    permissionAny: ["can_edit_employees", "can_view_payroll"],
  },
  "/dashboard/settings": { permission: "can_edit_employees" },
  "/dashboard/permissions": { ownerOnly: true },
};

export function resolveDashboardRouteRule(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/dashboard";
  if (DASHBOARD_ROUTE_ACCESS[path]) return DASHBOARD_ROUTE_ACCESS[path];

  const entries = Object.entries(DASHBOARD_ROUTE_ACCESS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [prefix, rule] of entries) {
    if (path.startsWith(`${prefix}/`) || path === prefix) return rule;
  }
  return null;
}

export function canAccessDashboardRoute(
  pathname,
  { permissions, isOwner, role },
) {
  if (isOwner) return true;

  const rule = resolveDashboardRouteRule(pathname);
  if (!rule) return true;
  if (rule.ownerOnly) return false;

  const normalizedRole = String(role ?? "").trim();
  if (rule.roles?.includes(normalizedRole)) return true;

  if (rule.permission) return Boolean(permissions?.[rule.permission]);
  if (rule.permissionAny?.length) {
    return rule.permissionAny.some((key) => Boolean(permissions?.[key]));
  }
  return true;
}
