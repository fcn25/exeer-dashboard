import { NavAccessGate } from "../ProtectedRoute.jsx";

export function AttendanceSettingsGate({ children }) {
  return <NavAccessGate navKey="system_customization">{children}</NavAccessGate>;
}
