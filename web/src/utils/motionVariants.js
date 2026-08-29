// Variants de Framer Motion reutilizadas para animaciones de entrada
// consistentes en dashboards, listas y grids de tarjetas.

export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};
