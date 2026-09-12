export function ProgressRing({
  done,
  total,
  size = 44,
  stroke = 5,
  color = "var(--accent2-bright)",
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg
      className="ring-svg shrink-0"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${done} of ${total} papers done`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(15,23,42,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.28}
        fontWeight={600}
        fill="currentColor"
      >
        {total > 0 ? Math.round(pct * 100) : 0}%
      </text>
    </svg>
  );
}
