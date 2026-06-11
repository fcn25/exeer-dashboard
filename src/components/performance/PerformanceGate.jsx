import { NavAccessGate } from "../ProtectedRoute.jsx";

export function PerformanceGate({ children }) {
  return <NavAccessGate navKey="performance">{children}</NavAccessGate>;
}
