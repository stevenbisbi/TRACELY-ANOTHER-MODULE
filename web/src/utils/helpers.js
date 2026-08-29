export const gradeColor = (g) => {
  if (g == null) return "var(--text3)";
  if (g >= 4.0) return "var(--green)";
  if (g >= 3.0) return "var(--accent)";
  return "var(--red)";
};

export const attColor = (a) =>
  a >= 85 ? "var(--green)" : a >= 75 ? "var(--orange)" : "var(--red)";

export const corteAvg = (actividades) => {
  const done = actividades.filter((a) => a.value != null);
  return done.length ? done.reduce((s, a) => s + a.value, 0) / done.length : null;
};

export const courseOverall = (cortes) => {
  let total = 0, weight = 0;
  cortes.forEach((c) => {
    const avg = corteAvg(c.actividades);
    if (avg != null) {
      total += avg * (c.weight / 100);
      weight += c.weight;
    }
  });
  return weight ? total / (weight / 100) : null;
};
