import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { canAccessSystemCustomization } from "../../utils/rbac.js";
import { repairStoredAuthProfile } from "../../utils/mobileAuth.js";

export function SystemCustomizationGate({ children }) {
  const location = useLocation();
  const { isOwner } = useAuth();
  const isMobile = location.pathname.startsWith("/mobile");

  useEffect(() => {
    repairStoredAuthProfile();
  }, []);

  if (isOwner || canAccessSystemCustomization()) {
    return children;
  }

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
