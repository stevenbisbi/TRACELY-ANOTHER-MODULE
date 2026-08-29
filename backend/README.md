# Tracely — Backend API

API REST del Sistema de Seguimiento Académico Tracely.  
Desarrollado con Node.js + Express + PostgreSQL + Sequelize.

---

## Requisitos previos

Antes de levantar el proyecto necesitas tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior

Verifica que estén instalados:
```bash
node --version
psql --version
```

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```
Abre el archivo `.env` y edita las credenciales de PostgreSQL:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tracely
DB_USER=postgres
DB_PASS=tu_contraseña_de_postgres
```

### 4. Crear la base de datos
```bash
psql -U postgres -c "CREATE DATABASE tracely;"
```

### 5. Ejecutar el seed (crea tablas y datos de prueba)
```bash
npm run seed
```

Al terminar verás las credenciales de acceso demo:
```
Admin:      admin@unicatolica.edu.co  /  admin123   (ID: 1)
Profesor:   c.ramirez@unicatolica.edu.co  /  prof123   (ID: 2)
Estudiante: michael.sanchez@unicatolica.edu.co  /  est123  (ID: 3)
```

### 6. Levantar el servidor
```bash
npm run dev
```

El servidor queda corriendo en:
- **API:** http://localhost:3000
- **Swagger (documentación):** http://localhost:3000/api/docs

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor con nodemon (recarga automática) |
| `npm start` | Levanta el servidor en producción |
| `npm run seed` | Recrea las tablas y carga datos de prueba |

> ⚠️ `npm run seed` borra y recrea todas las tablas. No correr en producción.

---

## Estructura del proyecto

```
backend/
├── src/
│   ├── app.js                  # Punto de entrada
│   ├── config/
│   │   ├── database.js         # Conexión a PostgreSQL
│   │   ├── swagger.js          # Documentación API
│   │   └── seed.js             # Datos de prueba
│   ├── middlewares/
│   │   └── auth.js             # Verificación JWT
│   ├── models/
│   │   └── index.js            # Asociaciones entre modelos
│   └── modules/
│       ├── users/              # Autenticación y usuarios
│       ├── careers/            # Carreras/programas
│       ├── courses/            # Cursos
│       ├── semesters/          # Semestres
│       ├── enrollments/        # Inscripciones
│       ├── grades/             # Notas
│       └── attendance/         # Asistencia
├── .env.example                # Plantilla de variables de entorno
├── .gitignore
└── package.json
```

---

## Endpoints principales

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/status` | Health check | No |
| POST | `/api/users/register` | Registrar usuario | No |
| POST | `/api/users/login` | Iniciar sesión | No |
| GET | `/api/users/me` | Perfil del usuario | JWT |
| GET | `/api/grades/student/:id` | Notas del estudiante | JWT |
| POST | `/api/grades` | Registrar nota | JWT + Profesor |
| POST | `/api/grades/bulk` | Subir notas en lote | JWT + Profesor |
| GET | `/api/attendance/student/:id` | Asistencia del estudiante | JWT |
| POST | `/api/attendance/bulk` | Guardar asistencia del día | JWT + Profesor |

Documentación completa en **http://localhost:3000/api/docs**

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `tracely` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASS` | Contraseña de PostgreSQL | `tu_contraseña` |
| `JWT_SECRET` | Clave secreta para tokens JWT | `cambiar_en_produccion` |
| `JWT_EXPIRES_IN` | Duración del token | `8h` |
| `CORS_ORIGIN` | URL del frontend | `http://localhost:5173` |

---

## Tecnologías

- **Node.js** + **Express** — servidor y rutas
- **Sequelize** — ORM para PostgreSQL
- **PostgreSQL** — base de datos
- **JWT** — autenticación por tokens
- **bcrypt** — hash de contraseñas
- **Swagger UI** — documentación interactiva
- **nodemon** — recarga automática en desarrollo
