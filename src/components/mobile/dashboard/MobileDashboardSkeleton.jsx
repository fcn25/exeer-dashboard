import { MOBILE_CARD } from "../../home/homeStyles.js";

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gray-100 ${className}`}
      aria-hidden
    />
  );
}

export function AttendanceWidgetSkeleton() {
  return (
    <div className={`${MOBILE_CARD} flex items-center gap-3`}>
      <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
      <SkeletonBlock className="h-9 w-16 rounded-xl" />
    </div>
  );
}

export function BentoGridSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-4" aria-label="جاري تحميل الإحصائيات">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonBlock key={index} className="h-[88px]" />
      ))}
    </section>
  );
}

export function TabListSkeleton() {
  return (
    <div className="space-y-3" aria-label="جاري تحميل القائمة">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBlock key={index} className={`${MOBILE_CARD} h-[76px]`} />
      ))}
    </div>
  );
}
