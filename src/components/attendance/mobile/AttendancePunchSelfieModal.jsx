import FaceSelfieCapture from "./FaceSelfieCapture.jsx";

export default function AttendancePunchSelfieModal({
  isOpen,
  onClose,
  onConfirm,
  isVerifying = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="punch-selfie-title"
    >
      <div className="md-surface max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-md p-5 sm:rounded-md">
        <FaceSelfieCapture
          title="تأكيد الوجه للبصمة"
          subtitle="التقط سيلفي مباشر للتحقق قبل تسجيل الحضور أو الانصراف."
          confirmLabel={isVerifying ? "جاري التسجيل..." : "تأكيد والتسجيل"}
          onConfirm={onConfirm}
          onCancel={onClose}
          isSaving={isVerifying}
        />
      </div>
    </div>
  );
}
