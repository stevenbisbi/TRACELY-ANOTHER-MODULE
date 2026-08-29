# Tracely — Frontend

Interfaz web del Sistema de Seguimiento Académico Tracely.  
Desarrollado con React 19 + Vite + CSS puro.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior

```bash
node --version
```

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd web
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```

Contenido del `.env`:
```
VITE_API_URL=http://localhost:3000/api
```

> Mientras el backend no esté conectado, el frontend usa datos mock automáticamente.

### 4. Levantar el proyecto
```bash
npm run dev
```

La app queda disponible en **http://localhost:5173**

---

## Credenciales de prueba (modo mock)

| Rol | ID | Contraseña |
|---|---|---|
| Estudiante | `12345` | cualquiera |
| Docente | `99999` | cualquiera |
| Administrador | `00001` | cualquiera |

Cuando el backend esté activo, usar las credenciales reales del seed.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción en `/dist` |
| `npm run preview` | Previsualiza el build de producción |

---

## Estructura del proyecto

```
web/
└── src/
    ├── assets/          # Imágenes y recursos estáticos
    ├── components/
    │   ├── charts/      # Gráficas (RingChart, MiniBarChart, GradePanel)
    │   ├── layout/      # MainLayout, Sidebar, Topbar
    │   └── ui/          # Componentes reutilizables (Button, Card, Badge)
    ├── context/
    │   ├── AuthContext.jsx   # Sesión del usuario (persiste en localStorage)
    │   └── AppContext.jsx    # Estado global (semestre activo, página)
    ├── data/
    │   └── mockData.js       # Datos de prueba (se reemplaza con API real)
    ├── hooks/           # Hooks personalizados
    ├── router/
    │   └── AppRouter.jsx     # Rutas protegidas por rol
    ├── services/
    │   ├── authService.js    # Login/logout → aquí se conecta el backend
    │   ├── gradesService.js  # Notas
    │   └── attendanceService.js  # Asistencia
    ├── styles/
    │   ├── global.css        # Variables CSS y estilos base
    │   └── auth.css          # Estilos de login y forgot password
    ├── utils/
    │   └── helpers.js        # Funciones de color y cálculo de promedios
    └── views/
        ├── auth/             # LoginView, ForgotPasswordPage
        ├── admin/            # Dashboard del administrador
        ├── student/          # Dashboard, Notas, Asistencia
        ├── teacher/          # Dashboard del docente
        └── shared/           # NotFoundPage
```

---

## Roles del sistema

| Rol | Acceso | Ruta |
|---|---|---|
| `student` | Dashboard, Notas, Asistencia | `/student/*` |
| `teacher` | Dashboard, control de asistencia y notas | `/teacher/*` |
| `admin` | Panel institucional completo | `/admin/*` |

La sesión se guarda en `localStorage` con la clave `tracely_session` y persiste entre recargas.

---

## Conectar con el backend

Cuando el backend esté listo, editar `src/services/authService.js` y descomentar las llamadas reales al API. El resto de la app no requiere cambios gracias al patrón de servicios aislados.

---

## Tecnologías

- **React 19** — interfaz de usuario
- **Vite 7** — bundler y servidor de desarrollo
- **React Router DOM v7** — navegación y rutas protegidas
- **CSS puro con variables** — sistema de diseño sin frameworks externos
- **DM Sans** — tipografía principal (Google Fonts)
