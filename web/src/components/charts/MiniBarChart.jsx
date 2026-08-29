import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MiniBarChart({ data, color = "var(--accent)" }) {
  const [hovered, setHovered] = useState(null);

  if (!data.length)
    return (
      <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "16px 0" }}>
        Sin datos
      </div>
    );

  const max = Math.max(...data.map((d) => d.rate));

  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div
          key={d.month}
          className="bar-wrap"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
        >
          <AnimatePresence>
            {hovered === i && (
              <motion.div
                className="bar-tooltip"
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ duration: 0.12 }}
              >
                <strong>{d.rate}%</strong> · {d.month}
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
            <motion.div
              className="bar"
              initial={{ height: 0, opacity: 0.5 }}
              animate={{ height: `${(d.rate / max) * 100}%`, opacity: 0.5 + (d.rate / max) * 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
              whileHover={{ scale: 1.06 }}
              style={{ background: color, transformOrigin: "bottom" }}
            />
          </div>
          <div className="bar-label">{d.month}</div>
        </div>
      ))}
    </div>
  );
}
