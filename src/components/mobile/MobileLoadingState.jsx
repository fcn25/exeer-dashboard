export default function MobileLoadingState({ label = "جاري التحميل..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-slate-900"
        aria-hidden
      />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
