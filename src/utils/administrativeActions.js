import {
  ADMINISTRATIVE_ACTION_WINDOW_DAYS,
  SALARY_DEDUCTION_ACTION_TYPE,
} from "../constants/administrativeActions.js";

export function isSalaryDeductionAction(actionType) {
  return actionType === SALARY_DEDUCTION_ACTION_TYPE;
}

export function getActiveActionsWindowStartIso() {
  const start = new Date();
  start.setDate(start.getDate() - ADMINISTRATIVE_ACTION_WINDOW_DAYS);
  return start.toISOString();
}
