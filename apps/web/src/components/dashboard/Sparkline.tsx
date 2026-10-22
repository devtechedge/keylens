import type { UsageSeriesPoint } from "@/api-types";

/**
 * Hand-rolled inline SVG sparkline. No chart library.
 * Colors come from CSS variables so they adapt to light/dark themes.
 */
export function Sparkline({
  points,
  width = 320,
  height = 88,
}: {
  points: UsageSeriesPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-slate-500">
        No usage data for this key
      </div>
    );
  }

  const values = points.map((p) => p.spendUsd);
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(points.length - 1, 1);
  const padY = 6;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - padY - ((p.spendUsd - min) / range) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Spend sparkline, last 14 days"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="kl-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--kl-spark-fill)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--kl-spark-fill)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#kl-spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--kl-spark-stroke)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
