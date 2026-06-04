import { fetchCompanyBilling } from "./billingService.js";
import { countCompanyEmployees } from "./employeesService.js";

export async function fetchEmployeeLimitContext() {
  const [billing, employeeCount] = await Promise.all([
    fetchCompanyBilling(),
    countCompanyEmployees(),
  ]);

  return {
    tier: billing.subscription_tier,
    employeeCount,
  };
}
