import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";

const EMPLOYEE_PROFILE_COLUMNS =
  "id, company_id, full_name, email, phone_number, gender, date_of_birth, nationality, id_number, employee_number, hire_date, contract_type, employment_status, role, direct_manager_name, job_title_name, department, basic_salary, housing_allowance, other_allowance, leave_balance";

const EMPLOYEE_PROFILE_COLUMNS_NO_LEAVE =
  "id, company_id, full_name, email, phone_number, gender, date_of_birth, nationality, id_number, employee_number, hire_date, contract_type, employment_status, role, direct_manager_name, job_title_name, department, basic_salary, housing_allowance, other_allowance";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل بيانات الموظف.";
}

export async function fetchEmployeeProfileById(employeeId) {
  const companyId = getCompanyId();
  const id = Number(employeeId);
  if (!companyId || Number.isNaN(id)) {
    throw new Error("معرّف الموظف غير صالح.");
  }

  let { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("employees")
      .select(EMPLOYEE_PROFILE_COLUMNS_NO_LEAVE)
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
    if (data) data.leave_balance = data.leave_balance ?? 0;
  }

  if (error) throw new Error(mapDbError(error));
  if (!data) throw new Error("لم يتم العثور على الموظف.");

  return data;
}
