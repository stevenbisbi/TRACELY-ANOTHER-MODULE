export default function RingChart({ value, max = 5, size = 80, color = "#FE9300", label, sublabel }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((value / max) * circ).toFixed(2);

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }} />
      </svg>
      <div className="ring-label">
        <div style={{ fontSize: size < 80 ? 13 : 18, fontWeight: 700, letterSpacing: "-0.5px", color }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}
