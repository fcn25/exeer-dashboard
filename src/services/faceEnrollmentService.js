import { getCompanyId } from "../utils/mobileAuth.js";

const STORAGE_PREFIX = "exeer_face_enrollment";

function storageKey(employeeId) {
  return `${STORAGE_PREFIX}_${getCompanyId()}_${Number(employeeId)}`;
}

export function getFaceEnrollment(employeeId) {
  if (!employeeId) return null;

  try {
    const raw = localStorage.getItem(storageKey(employeeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.previewDataUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isFaceEnrolled(employeeId) {
  return Boolean(getFaceEnrollment(employeeId)?.previewDataUrl);
}

export function saveFaceEnrollment(employeeId, previewDataUrl) {
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    throw new Error("معرّف الموظف غير صالح.");
  }

  const trimmedPreview = String(previewDataUrl ?? "").trim();
  if (!trimmedPreview.startsWith("data:image/")) {
    throw new Error("صورة الوجه غير صالحة.");
  }

  localStorage.setItem(
    storageKey(resolvedEmployeeId),
    JSON.stringify({
      enrolledAt: new Date().toISOString(),
      previewDataUrl: trimmedPreview,
    }),
  );
}

export function clearFaceEnrollment(employeeId) {
  if (!employeeId) return;
  localStorage.removeItem(storageKey(employeeId));
}
