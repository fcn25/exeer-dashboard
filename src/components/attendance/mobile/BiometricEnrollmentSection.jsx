import { useEffect, useState } from "react";
import { CheckCircle2, ScanFace } from "lucide-react";
import { useTranslation } from "react-i18next";
import AttendancePunchCamera from "./AttendancePunchCamera.jsx";
import {
  getFaceEnrollment,
  isFaceEnrolled,
  saveFaceEnrollment,
} from "../../../services/faceEnrollmentService.js";

export default function BiometricEnrollmentSection({ employeeId, onEnrollmentChange }) {
  const { t } = useTranslation();
  const [enrollment, setEnrollment] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) {
      setEnrollment(null);
      return;
    }
    setEnrollment(getFaceEnrollment(employeeId));
  }, [employeeId]);

  const enrolled = isFaceEnrolled(employeeId);

  const handleCapture = async (previewDataUrl) => {
    setIsSaving(true);
    setError("");

    try {
      saveFaceEnrollment(employeeId, previewDataUrl);
      const next = getFaceEnrollment(employeeId);
      setEnrollment(next);
      setIsCameraOpen(false);
      onEnrollmentChange?.(true);
    } catch (err) {
      setError(err.message || t("pages.mobile.attendance.enrollmentError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!employeeId) return null;

  return (
    <>
      <section
        className="rounded-2xl border border-exeer-border bg-md-surface p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
        aria-labelledby="biometric-enrollment-heading"
      >
        <div className="mb-3 flex items-center gap-2">
          <ScanFace
            className="h-4 w-4 text-exeer-primary dark:text-[var(--text-primary)]"
            aria-hidden
          />
          <h3
            id="biometric-enrollment-heading"
            className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
          >
            {t("pages.mobile.attendance.enrollmentTitle")}
          </h3>
        </div>

        {enrolled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              {enrollment?.previewDataUrl ? (
                <img
                  src={enrollment.previewDataUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-emerald-300 dark:ring-emerald-800"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {t("pages.mobile.attendance.enrolled")}
                </p>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  {t("pages.mobile.attendance.enrolledHint")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="md-btn-tonal w-full text-xs"
            >
              {t("pages.mobile.attendance.reEnroll")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
              {t("pages.mobile.attendance.captureSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="md-btn-primary w-full"
            >
              {t("pages.mobile.attendance.startEnrollment")}
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      <AttendancePunchCamera
        isOpen={isCameraOpen}
        branchName={t("pages.mobile.attendance.enrollmentBranchLabel")}
        onCapture={handleCapture}
        onClose={() => {
          if (!isSaving) setIsCameraOpen(false);
        }}
        isProcessing={isSaving}
      />
    </>
  );
}
