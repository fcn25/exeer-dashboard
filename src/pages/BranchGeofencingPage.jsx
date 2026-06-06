import { Navigate } from "react-router-dom";

/** @deprecated Use /dashboard/attendance/settings */
export default function BranchGeofencingPage() {
  return <Navigate to="/dashboard/attendance/settings" replace />;
}
