import { createContext, useContext, useState, useEffect } from "react";
import { getSemesters, getActiveSemester } from "../services/semesterService";

const AppContext = createContext(null);

function loadStoredSemestre() {
  try {
    return localStorage.getItem("tracely_semestre");
  } catch {
    return null;
  }
}

export function AppProvider({ children }) {
  const [semestre, setSemestreState] = useState(() => loadStoredSemestre() ?? "");
  const [semestres, setSemestres] = useState([]);

  // Carga la lista real de semestres desde la BD y corrige el semestre
  // seleccionado si el guardado en localStorage ya no existe (o nunca
  // existió) — evita quedar pidiendo datos de un semestre que la BD
  // no tiene, que hacía ver el dashboard vacío para todos los roles.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [lista, activo] = await Promise.all([getSemesters(), getActiveSemester()]);
        if (cancelado) return;

        const codigos = lista.map((s) => s.codigo);
        setSemestres(codigos);

        const guardado = loadStoredSemestre();
        if (!guardado || !codigos.includes(guardado)) {
          const inicial = activo?.codigo ?? codigos[0] ?? "";
          if (inicial) {
            localStorage.setItem("tracely_semestre", inicial);
            setSemestreState(inicial);
          }
        }
      } catch {
        // Si el backend no responde, se mantiene el semestre guardado/local.
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const setSemestre = (s) => {
    localStorage.setItem("tracely_semestre", s);
    setSemestreState(s);
  };

  return (
    <AppContext.Provider value={{ semestre, setSemestre, semestres }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
