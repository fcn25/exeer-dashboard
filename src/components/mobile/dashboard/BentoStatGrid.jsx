import { BentoGridSkeleton } from "./MobileDashboardSkeleton.jsx";

export default function BentoStatGrid({ stats, isLoading }) {
  if (isLoading) {
    return <BentoGridSkeleton />;
  }

  if (!stats?.length) {
    return null;
  }

  return (
    <section
      className="grid grid-cols-2 gap-4"
      aria-label="إحصائيات سريعة"
    >
      {stats.map((stat) => (
        <article
          key={stat.id}
          className={`flex flex-col justify-between rounded-2xl border border-exeer-border ${stat.bg} p-4 shadow-sm dark:border-[var(--border-color)] ${
            stat.span === 2 ? "col-span-2" : ""
          }`}
        >
          <p className={`text-2xl font-bold tracking-tight ${stat.accent}`}>
            {stat.value}
          </p>
          <p className="mt-2 text-xs font-medium leading-snug text-exeer-muted">
            {stat.label}
          </p>
        </article>
      ))}
    </section>
  );
}
