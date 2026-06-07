import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";

export default function PayrollBarChart({ data = [], height = 120, className = "" }) {
  const points = Array.isArray(data) ? data.filter((row) => row?.value != null) : [];
  if (!points.length) return null;

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            interval={0}
          />
          <Bar
            dataKey="value"
            fill="#0F172A"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
