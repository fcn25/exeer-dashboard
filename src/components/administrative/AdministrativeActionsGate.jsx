import { NavAccessGate } from "../ProtectedRoute.jsx";

export function AdministrativeActionsGate({ children }) {
  return <NavAccessGate navKey="admin_actions">{children}</NavAccessGate>;
}
