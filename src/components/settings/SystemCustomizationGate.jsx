import { Navigate, useLocation } from "react-router-dom";
import { isOwner } from "../../utils/rbac.js";

export function SystemCustomizationGate({ children }) {
  const location = useLocation();
  const isMobile = location.pathname.startsWith("/mobile");

  if (!isOwner()) {
    return (
      <Navigate
        to={isMobile ? "/mobile" : "/dashboard"}
        replace
        state={{
          unauthorizedToast: "ليس لديك صلاحية الوصول إلى تخصيص النظام.",
        }}
      />
    );
  }
  return children;
}
