import { Navigate } from "react-router-dom";
import { isOwner } from "../../utils/rbac.js";

export function SystemCustomizationGate({ children }) {
  if (!isOwner()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ unauthorizedToast: "ليس لديك صلاحية الوصول إلى تخصيص النظام." }}
      />
    );
  }
  return children;
}
