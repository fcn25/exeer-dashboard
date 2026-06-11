/**
 * Route access — derived from ROLE_NAV (roleNav.js). Do not add role lists here.
 */
import {
  resolveRouteNavRule,
  roleCanAccessNavKey,
  roleCanAccessPath,
  roleHasNavKey,
} from "./roleNav.js";

export {
  resolveRouteNavRule,
  roleCanAccessNavKey,
  roleCanAccessPath,
  roleHasNavKey,
};

/** @deprecated Use roleCanAccessPath(role, pathname) */
export function canAccessDashboardRoute(pathname, { role }) {
  return roleCanAccessPath(role, pathname);
}

/** @deprecated Use resolveRouteNavRule(pathname) */
export function resolveDashboardRouteRule(pathname) {
  const rule = resolveRouteNavRule(pathname);
  if (!rule) return null;
  return { navKey: rule.navKey, altNavKeys: rule.altNavKeys ?? [] };
}
