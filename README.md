# Tracely — Sistema de Seguimiento Académico

Plataforma para el seguimiento académico de estudiantes: asistencia, notas, alertas de riesgo y excusas de inasistencia (con apoyo de un asistente de IA que analiza certificados contra el reglamento — la decisión siempre es de la Dirección del programa, nunca automática salvo que las verificaciones determinísticas lo permitan).

Desarrollado para UNICATÓLICA.

---

## Estructura del repositorio

```
Tracely/
├── backend/    API REST — Node.js + Express + PostgreSQL + Sequelize
├── web/        Frontend web — React 19 + Vite
├── Mobile/     App móvil — Expo / React Native
└── deploy/     Configuración de Nginx para producción (VPS)
```

Cada carpeta tiene su propio `README.md` con el detalle completo. Esta guía es el punto de entrada rápido.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior
- Para la app móvil: [Expo Go](https://expo.dev/go) en el celular, o un emulador Android/iOS

---

## Arranque rápido

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` → credenciales de tu Postgres local
- `JWT_SECRET` → cualquier string propio (no dejar el de ejemplo)
- `RESEND_API_KEY` y `ANTHROPIC_API_KEY` → **opcionales**. Sin ellos el servidor arranca igual; solo quedan deshabilitados el envío de correos (alertas, notas, reset de contraseña) y el análisis con IA de las excusas.

```bash
psql -U postgres -c "CREATE DATABASE tracely;"
npm run seed     # crea las tablas y carga datos de prueba (imprime credenciales demo)
npm run dev
```

Queda en `http://localhost:3000` (Swagger en `/api/docs`).

### 2. Web

```bash
cd web
npm install
cp .env.example .env   # ya trae VITE_API_URL=http://localhost:3000/api
npm run dev
```

Queda en `http://localhost:5173`.

### 3. Mobile (Expo)

```bash
cd Mobile
npm install
cp .env.example .env
```

Edita `Mobile/.env` — `EXPO_PUBLIC_API_URL` debe apuntar a una IP alcanzable desde el celular, **no** `localhost`:
- Celular físico con Expo Go: IP LAN del PC (`ipconfig` / `ifconfig`)
- Emulador Android Studio: `http://10.0.2.2:3000/api`
- Simulador iOS (Mac): `http://localhost:3000/api`

```bash
npx expo start
```

---

## Credenciales de prueba (tras `npm run seed`)

| Rol | ID institucional | Contraseña |
|---|---|---|
| Admin | `ADM-001` | `admin123` |
| Director de programa | `DIR-TDS` | `dir123` |
| Docente | `DOC-0112` (Dr. Carlos Ramírez) | `prof123` |
| Estudiante | `2021-0342` (Michael Sanchez) | `est123` |
| Estudiante | `2022-0411` (Andrés Mejía) | `est123` |
| Estudiante | `2021-0199` (Valentina Torres) | `est123` |

> ⚠️ `npm run seed` borra y recrea todas las tablas. No correrlo en producción.

### Probar el flujo de excusas con certificados reales

En `backend/data/demo/` hay certificados PDF listos para radicar como Andrés o Valentina y ver
cómo los evalúa la IA (uno se avala automático, el otro queda pendiente para el director). Guía
completa con qué PDF usar, con qué estudiante y qué fechas declarar: [`backend/data/demo/DEMO.md`](backend/data/demo/DEMO.md).

### Qué ve cada rol en el módulo de excusas (IA)

| Rol | Dónde | Qué ve |
|---|---|---|
| **Estudiante** | `/student/excusas` (sidebar → "Excusas") | Formulario para radicar (fechas + certificado o explicación escrita) y su lista "Mis excusas" con el estado (radicada, en revisión, avalada, rechazada). Recibe el resultado en tiempo real (Socket.IO) apenas se resuelve. **No** ve el análisis interno de la IA. |
| **Director de programa** | `/director/excusas` (sidebar → "Excusas") | Pestaña **Pendientes**: excusas de su programa esperando decisión, con el análisis completo de la IA (extracción del certificado, anomalías detectadas, evaluación contra el reglamento con citas del artículo) y los botones Avalar/Rechazar. Pestaña **Avaladas**: auditoría de las ya resueltas, incluidas las avaladas automáticamente (marcadas "verificación automática"). |
| **Docente** | `/teacher/courses` ("Mis Cursos") | Toma asistencia del día y ve el % acumulado de cada estudiante. Con el botón **"Historial de asistencia"** ve además el detalle día por día de todo el curso (matriz fecha × estudiante), donde las ausencias justificadas por una excusa avalada se marcan con un aro de color, distinguibles de las simples. No ve el análisis de la IA ni el certificado en sí — solo el resultado (justificada o no) reflejado en la asistencia. |

En resumen: la IA (extracción del certificado + evaluación contra el reglamento) solo es visible para la Dirección, que es quien decide; el estudiante ve el resultado, no el razonamiento; y el docente ve el efecto en la asistencia (incluido el historial completo), pero no el proceso de análisis ni decisión.

---

## Notas

- **IA (excusas):** el asistente solo prepara información (extrae datos del certificado y evalúa contra el reglamento con citas); la decisión de avalar o rechazar siempre es de la Dirección, salvo que las verificaciones determinísticas del sistema (identidad, fechas, plazo, legibilidad, certificado de tercero) permitan el aval automático.
- **Correos (Resend):** integrado pero requiere `RESEND_API_KEY` propio (gratis hasta 3000 emails/mes en [resend.com](https://resend.com)). Sin la key, el backend sigue funcionando normal y solo omite el envío.
- **Producción:** despliegue automático a una VPS vía GitHub Actions (`.github/workflows/deploy.yml`) al hacer push a `main`, con Nginx como proxy (`deploy/nginx/`). Requiere los secrets `VPS_HOST`, `VPS_USER` y `VPS_SSH_KEY` configurados en el repositorio.
