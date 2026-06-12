import { BentoGridSkeleton } from "./MobileDashboardSkeleton.jsx";
import { MOBILE_CARD, TYPE_META } from "../../home/homeStyles.js";

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
          className={`${MOBILE_CARD} flex flex-col justify-between ${
            stat.span === 2 ? "col-span-2" : ""
          }`}
        >
          <p className={`text-2xl font-bold tracking-tight ${stat.accent}`}>
            {stat.value}
          </p>
          <p className={`${TYPE_META} mt-2 font-medium leading-snug`}>
            {stat.label}
          </p>
        </article>
      ))}
    </section>
  );
}
