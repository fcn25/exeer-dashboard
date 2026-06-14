import { Navigate } from "react-router-dom";
import { canShowBilling } from "../../lib/platform.ts";

/** Redirects billing/subscription routes away when billing UI is blocked. */
export default function BillingRouteRedirect({
  billingTarget = "/dashboard/settings?tab=subscription",
  fallbackTarget = "/dashboard/settings",
}) {
  const target = canShowBilling() ? billingTarget : fallbackTarget;
  return <Navigate to={target} replace />;
}
