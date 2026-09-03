# Guion de demo — Asistente IA de TRACELY

Dos actos: (1) flujo de excusa de inasistencia, (2) interpretación de un reglamento nuevo.
En ambos el patrón es el mismo: **la IA interpreta y propone; un humano decide; el motor determinístico ejecuta.**

Credenciales: estudiante `2021-0342`/`est123` · director `DIR-TDS`/`dir123` · admin `ADM-001`/`admin123`

---

## Certificados adicionales para revisión manual desde la web (sin curl)

Para probar el flujo completo desde la interfaz (sin terminal): iniciar sesión como el estudiante,
ir a "Radicar excusa", subir el PDF y las fechas indicadas; luego iniciar sesión como `DIR-TDS` y
avalar o rechazar desde "Excusas".

| PDF | Estudiante | Fechas a declarar | Qué muestra |
|---|---|---|---|
| `incapacidad_andres_mejia.pdf` | `2022-0411` / `est123` (Andrés Mejía) | 2026-09-01 a 2026-09-02 | Certificado limpio, con membrete, firma y sello → pasa **todas** las compuertas y se avala automáticamente por la IA, sin pasar por el director. Bueno para mostrar el camino feliz. |
| `incapacidad_valentina_torres.pdf` | `2021-0199` / `est123` (Valentina Torres) | 2026-09-02 a 2026-09-03 | El certificado dice 5–6 de septiembre, pero la excusa se declara para 2–3 de septiembre → la verificación determinística de fechas detecta el desfase y obliga a revisión manual, sin depender del criterio del modelo. |

Ambos casos ya tienen inasistencias reales registradas en esas fechas (Bases de Datos II), así que al
avalar desde el panel del director se justifican de verdad.

---

## Preparación (una vez, antes de la demo)

```bash
# 1. Levantar Postgres
"$HOME/scoop/apps/postgresql/current/bin/pg_ctl.exe" -D "$HOME/scoop/apps/postgresql/current/data" -l "$HOME/scoop/apps/postgresql/current/pg.log" start

# 2. Reset a estado limpio (política v1 = 20%, sin excusas de prueba)
cd backend && npm run seed

# 3. Arrancar el backend (toma AI_MODEL del .env — hoy Haiku)
npm start
```

---

## ACTO 1 — Flujo de excusa

**Narrativa:** "Un estudiante faltó a clase. Sube su incapacidad. La IA la lee, la evalúa contra el
reglamento citando el artículo, y la Dirección decide. La IA nunca decide ni toca la asistencia."

```bash
# a) El estudiante radica la incapacidad (PDF real)
TOK=$(curl -s -X POST localhost:3000/api/users/login -H 'Content-Type: application/json' \
  -d '{"id":"2021-0342","password":"est123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s -X POST localhost:3000/api/excusas -H "Authorization: Bearer $TOK" \
  -F "inscripcion_id=<ID_BD2>" -F "fecha_inicio=2025-03-17" -F "fecha_fin=2025-03-17" \
  -F "documento=@backend/data/demo/incapacidad_michael.pdf;type=application/pdf" | python -m json.tool
# → MOSTRAR: extracción IA (EPS, fechas), anomalías detectadas, dentro_de_plazo (determinístico)

# b) El director ve lo pendiente y su evaluación con CITAS del Art. 29
DTOK=$(curl -s -X POST localhost:3000/api/users/login -H 'Content-Type: application/json' \
  -d '{"id":"DIR-TDS","password":"dir123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s localhost:3000/api/excusas/pendientes -H "Authorization: Bearer $DTOK" | python -m json.tool
# → MOSTRAR: analisis_ia.evaluacion.text (causal válida / plazo) + citations (Art.29, pág 20-21)

# c) El director AVALA → la asistencia queda justificada
curl -s -X POST localhost:3000/api/excusas/<ID_EXCUSA>/decision -H "Authorization: Bearer $DTOK" \
  -H "Content-Type: application/json" -d '{"decision":"avalar","motivo":"Incapacidad válida"}'
# → MOSTRAR: inasistenciasJustificadas: 1
```

El `<ID_BD2>` es la inscripción de Michael en Bases de Datos II. Para obtenerlo:
```bash
psql -U postgres -d tracely -t -c "SELECT i.id FROM inscripcion i JOIN estudiante e ON i.estudiante_id=e.id JOIN asignatura a ON i.asignatura_id=a.id WHERE e.usuario_id='2021-0342' AND a.nombre='Bases de Datos II';"
```

---

## ACTO 2 — Interpretación de reglamento nuevo

**Narrativa:** "Cambia el reglamento. En vez de que un programador reescriba reglas, la IA lo lee,
detecta qué cambió, distingue lo que es un simple valor de lo que necesita desarrollo, y estima
el impacto. El admin aprueba y el sistema pasa a aplicar la nueva norma sin tocar código."

```bash
ATOK=$(curl -s -X POST localhost:3000/api/users/login -H 'Content-Type: application/json' \
  -d '{"id":"ADM-001","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# a) Subir el reglamento reformado → la IA compara vs la política vigente
curl -s -X POST localhost:3000/api/politica/interpretar -H "Authorization: Bearer $ATOK" \
  -F "reglamento=@backend/data/demo/reglamento_v2027.pdf;type=application/pdf" | python -m json.tool
# → MOSTRAR: cambios PARAMETRICOS (20%→15%, 3→5 días, con artículo) +
#            cambios ESTRUCTURALES (virtual al 50%, etc. → "requieren desarrollo") + impacto

# b) El admin APLICA la política aprobada
curl -s -X POST localhost:3000/api/politica/aplicar -H "Authorization: Bearer $ATOK" \
  -H "Content-Type: application/json" \
  -d '{"parametros":{"inasistencia_max_sin_justificar":0.15,"inasistencia_max_con_justificar":0.30,"plazo_radicacion_dias_habiles":5,"tipos_justificacion":["enfermedad_incapacitante","calamidad_domestica","motivos_laborales","emergencia_desastre"],"nota_perdida_por_inasistencia":0.0,"nota_aprobacion":3.0},"reglamento_version":"2027-reforma"}'
# → MOSTRAR: "Política v2 activada" — el motor ya usa 15% sin cambios de código
```

---

## El cierre (la frase para la entrevista)

> "La IA interpreta documentos y propone; la persona con autoridad decide; el motor determinístico
> ejecuta. La IA reduce el trabajo de leer, no la responsabilidad de firmar. Es el mismo patrón de
> un flujo de aprobación de documentos, aplicado al dominio académico."
