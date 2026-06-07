import { Line, LineChart, ResponsiveContainer } from "recharts";

export default function SparkLine({ data = [], height = 40, className = "" }) {
  const points = Array.isArray(data) ? data.filter((row) => row?.value != null) : [];
  if (points.length < 2) return null;

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0F172A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
